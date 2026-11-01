import type { FoodSearchResponse } from "@maroutine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppDatabase } from "@/db/client";
import { food } from "@/db/schema";
import type { SessionInfo } from "@/server/auth";
import { resetOffRateLimit } from "@/server/services/foods";
import {
  makeFoodBarcodeRoutes,
  makeFoodRoutes,
  makeFoodsRoutes,
  makeFoodSearchRoutes,
  makeRecentFoodsRoutes,
} from "@/server/routes/foods";
import { makeFoodEntriesRoutes } from "@/server/routes/food-entries";
import { callRoute, insertUser } from "../helpers/api";
import { createTestDb } from "../helpers/test-db";

let db: AppDatabase;
let owner: SessionInfo;
let other: SessionInfo;

const hit = (code: string, name: string, kcal = 62) => ({
  code,
  product_name: name,
  brands: ["Marque"],
  nutriments: { "energy-kcal_100g": kcal, proteins_100g: 11 },
});

function search(
  session: SessionInfo | null,
  q: string,
  off: (q: string, signal: AbortSignal) => Promise<unknown[]>,
  timeoutMs = 3000,
) {
  return callRoute((deps) => makeFoodSearchRoutes(deps, off, timeoutMs), {
    db,
    method: "GET",
    url: `/api/v1/foods/search?q=${encodeURIComponent(q)}`,
    session,
  });
}
const names = (res: { body: unknown }) =>
  (res.body as FoodSearchResponse).results.map((r) => [r.name, r.source, r.recent]);

async function createFood(session: SessionInfo, name: string) {
  const res = await callRoute(makeFoodsRoutes, {
    db,
    method: "POST",
    url: "/api/v1/foods",
    session,
    body: { name, kcalPer100g: 62, proteinPer100g: 11 },
  });
  return res;
}

async function eat(session: SessionInfo, foodId: string, eatenOn = "2026-10-30") {
  return callRoute(makeFoodEntriesRoutes, {
    db,
    method: "POST",
    url: "/api/v1/food-entries",
    session,
    body: { eatenOn, meal: "lunch", foodId, quantityG: 100 },
  });
}

beforeEach(async () => {
  db = await createTestDb();
  owner = await insertUser(db, "owner");
  other = await insertUser(db, "other");
  resetOffRateLimit();
});

describe("aliments perso (F-ALI-2)", () => {
  it("crée, modifie et supprime un aliment perso du propriétaire seulement", async () => {
    const created = await createFood(owner, "Skyr maison");
    expect(created.status).toBe(201);
    const id = (created.body as { id: string }).id;
    const patch = (session: SessionInfo) =>
      callRoute(makeFoodRoutes, {
        db,
        method: "PATCH",
        url: `/api/v1/foods/${id}`,
        session,
        body: { name: "Skyr", kcalPer100g: 60, proteinPer100g: 10 },
        params: { id },
      });
    expect((await patch(other)).status).toBe(404);
    expect((await patch(owner)).body).toMatchObject({
      name: "Skyr",
      kcalPer100g: 60,
      source: "custom",
    });
    const del = (session: SessionInfo) =>
      callRoute(makeFoodRoutes, {
        db,
        method: "DELETE",
        url: `/api/v1/foods/${id}`,
        session,
        params: { id },
      });
    expect((await del(other)).status).toBe(404);
    expect((await del(owner)).status).toBe(204);
  });
});

describe("liste des aliments perso", () => {
  it("ne liste que les aliments perso de la session, par nom", async () => {
    await createFood(owner, "Skyr maison");
    await createFood(owner, "Avoine");
    await createFood(other, "Riz");
    const res = await callRoute(makeFoodsRoutes, {
      db,
      method: "GET",
      url: "/api/v1/foods",
      session: owner,
    });
    expect((res.body as { name: string }[]).map((f) => f.name)).toEqual(["Avoine", "Skyr maison"]);
  });
});

describe("recherche (§5, ADR 0007)", () => {
  it("perso d'abord, puis récents, puis Open Food Facts mis en cache sans doublon", async () => {
    const perso = (await createFood(owner, "Skyr maison")).body as { id: string };
    await createFood(other, "Skyr de l'autre");
    const off = vi.fn(async () => [
      hit("3017620422003", "Skyr nature"),
      hit("3017620422010", "Skyr vanille"),
      hit("3017620422027", "Skyr", 2000),
    ]);
    const first = await search(owner, "skyr", off);
    expect(first.status).toBe(200);
    expect(names(first)).toEqual([
      ["Skyr maison", "custom", false],
      ["Skyr nature", "off", false],
      ["Skyr vanille", "off", false],
    ]);
    // On mange le skyr nature : il devient récent, et le produit n'est pas dupliqué en cache.
    const nature = (first.body as FoodSearchResponse).results[1]!;
    await eat(owner, nature.id);
    await eat(owner, perso.id);
    const second = await search(owner, "skyr", off);
    expect(names(second)).toEqual([
      ["Skyr maison", "custom", true],
      ["Skyr nature", "off", true],
      ["Skyr vanille", "off", false],
    ]);
    expect((await db.select().from(food)).filter((f) => f.source === "off")).toHaveLength(2);
  });

  it("n'appelle pas Open Food Facts à partir de 10 résultats locaux", async () => {
    for (let i = 0; i < 10; i++) await createFood(owner, `Riz ${i}`);
    const off = vi.fn(async () => []);
    await search(owner, "riz", off);
    expect(off).not.toHaveBeenCalled();
  });

  it("renvoie les résultats locaux avec un avertissement si Open Food Facts échoue ou tarde", async () => {
    await createFood(owner, "Skyr maison");
    const failing = await search(owner, "skyr", async () => {
      throw new Error("réseau");
    });
    expect(failing.body).toMatchObject({ offUnavailable: true });
    expect(names(failing)).toEqual([["Skyr maison", "custom", false]]);
    const slow = await search(owner, "skyr", () => new Promise(() => {}), 50);
    expect(slow.body).toMatchObject({ offUnavailable: true });
  });

  it("limite les appels à Open Food Facts par utilisateur (T-09)", async () => {
    const off = vi.fn(async () => []);
    for (let i = 0; i < 8; i++) await search(owner, `pomme${i}`, off);
    expect(off).toHaveBeenCalledTimes(6);
  });

  it("refuse une requête trop courte, le compte démo et l'absence de session", async () => {
    const off = vi.fn(async () => []);
    expect((await search(owner, "s", off)).status).toBe(400);
    expect((await search({ ...owner, isDemo: true }, "skyr", off)).status).toBe(403);
    expect((await search(null, "skyr", off)).status).toBe(401);
    expect(off).not.toHaveBeenCalled();
  });
});

describe("aliments récents (F-ALI-6)", () => {
  it("du plus récent au plus ancien, sans ceux des autres", async () => {
    const a = (await createFood(owner, "Avoine")).body as { id: string };
    const b = (await createFood(owner, "Banane")).body as { id: string };
    await eat(owner, a.id, "2026-10-29");
    await eat(owner, b.id, "2026-10-30");
    const res = await callRoute(makeRecentFoodsRoutes, {
      db,
      method: "GET",
      url: "/api/v1/foods/recent",
      session: owner,
    });
    expect((res.body as { name: string }[]).map((f) => f.name)).toEqual(["Banane", "Avoine"]);
    const theirs = await callRoute(makeRecentFoodsRoutes, {
      db,
      method: "GET",
      url: "/api/v1/foods/recent",
      session: other,
    });
    expect(theirs.body).toEqual([]);
  });
});

describe("aliment par code-barres (D29)", () => {
  type Fetch = (code: string, signal: AbortSignal) => Promise<unknown>;

  function scan(session: SessionInfo | null, code: string, fetchProduct: Fetch, timeoutMs = 3000) {
    return callRoute((deps) => makeFoodBarcodeRoutes(deps, fetchProduct, timeoutMs), {
      db,
      method: "GET",
      url: `/api/v1/foods/barcode/${code}`,
      session,
      params: { code },
    });
  }

  it("trouve le produit sur Open Food Facts, le met en cache, puis le relit sans appel", async () => {
    const fetchProduct = vi.fn(async () => hit("3017620422003", "Pâte à tartiner", 539));
    const first = await scan(owner, "3017620422003", fetchProduct);
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({
      name: "Pâte à tartiner",
      brand: "Marque",
      kcalPer100g: 539,
      proteinPer100g: 11,
      source: "off",
    });
    expect(fetchProduct).toHaveBeenCalledWith("3017620422003", expect.any(AbortSignal));

    // Le cache est partagé : un autre utilisateur ne déclenche pas d'appel.
    const again = await scan(other, "3017620422003", fetchProduct);
    expect(again.status).toBe(200);
    expect((again.body as { id: string }).id).toBe((first.body as { id: string }).id);
    expect(fetchProduct).toHaveBeenCalledTimes(1);
  });

  it("un UPC-A cherche sa forme à 13 chiffres", async () => {
    const fetchProduct = vi.fn(async () => hit("0036000291452", "Céréales"));
    expect((await scan(owner, "036000291452", fetchProduct)).status).toBe(200);
    expect(fetchProduct).toHaveBeenCalledWith("0036000291452", expect.any(AbortSignal));
  });

  it("refuse un code à la clé fausse sans appel : 400 invalid_barcode", async () => {
    const fetchProduct = vi.fn(async () => null);
    const res = await scan(owner, "3017620422004", fetchProduct);
    expect(res).toEqual({ status: 400, body: { error: "invalid_barcode" } });
    expect(fetchProduct).not.toHaveBeenCalled();
  });

  it("un produit inconnu, ou sans valeurs exploitables : 404", async () => {
    expect((await scan(owner, "3017620422003", async () => null)).status).toBe(404);
    const noKcal = { code: "96385074", product_name: "Eau", nutriments: {} };
    expect((await scan(owner, "96385074", async () => noKcal)).status).toBe(404);
  });

  it("Open Food Facts en panne ou trop lent : 503 off_unavailable", async () => {
    const failing = await scan(owner, "3017620422003", async () => {
      throw new Error("réseau");
    });
    expect(failing).toEqual({ status: 503, body: { error: "off_unavailable" } });
    const slow = await scan(owner, "3017620422003", () => new Promise(() => {}), 20);
    expect(slow.status).toBe(503);
  });

  it("limite à 20 codes par minute et par utilisateur : 429 (T-09)", async () => {
    const fetchProduct = vi.fn(async () => null);
    // Codes EAN-8 valides et distincts : 0000000d + clé.
    const codes = Array.from({ length: 21 }, (_, i) => {
      const body = String(1000000 + i);
      const sum = [...body].reduce((acc, d, k) => acc + Number(d) * (k % 2 === 0 ? 3 : 1), 0);
      return `${body}${(10 - (sum % 10)) % 10}`;
    });
    for (const code of codes.slice(0, 20)) {
      expect((await scan(owner, code, fetchProduct)).status).toBe(404);
    }
    expect(await scan(owner, codes[20]!, fetchProduct)).toEqual({
      status: 429,
      body: { error: "rate_limited" },
    });
    expect((await scan(other, codes[20]!, fetchProduct)).status).toBe(404);
  });

  it("refuse le compte démo et l'absence de session", async () => {
    const fetchProduct = vi.fn(async () => null);
    expect(
      (await scan({ userId: "owner", isDemo: true }, "3017620422003", fetchProduct)).status,
    ).toBe(403);
    expect((await scan(null, "3017620422003", fetchProduct)).status).toBe(401);
    expect(fetchProduct).not.toHaveBeenCalled();
  });
});
