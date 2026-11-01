import type { DayJournal } from "@maroutine/core";
import { beforeEach, describe, expect, it } from "vitest";
import type { AppDatabase } from "@/db/client";
import type { SessionInfo } from "@/server/auth";
import {
  makeCopyEntriesRoutes,
  makeFoodEntriesRoutes,
  makeFoodEntryRoutes,
} from "@/server/routes/food-entries";
import { makeFoodRoutes, makeFoodsRoutes } from "@/server/routes/foods";
import { makeNutritionTargetsRoutes } from "@/server/routes/nutrition-targets";
import { callRoute, insertUser } from "../helpers/api";
import { createTestDb } from "../helpers/test-db";

let db: AppDatabase;
let owner: SessionInfo;
let other: SessionInfo;
let skyr: string;

const post = (session: SessionInfo, body: unknown) =>
  callRoute(makeFoodEntriesRoutes, {
    db,
    method: "POST",
    url: "/api/v1/food-entries",
    session,
    body,
  });
const journal = async (session: SessionInfo, date: string) =>
  (
    await callRoute(makeFoodEntriesRoutes, {
      db,
      method: "GET",
      url: `/api/v1/food-entries?date=${date}`,
      session,
    })
  ).body as DayJournal;
const one = (session: SessionInfo, method: "PATCH" | "DELETE", id: string, body?: unknown) =>
  callRoute(makeFoodEntryRoutes, {
    db,
    method,
    url: `/api/v1/food-entries/${id}`,
    session,
    body,
    params: { id },
  });
const copy = (session: SessionInfo, body: unknown) =>
  callRoute(makeCopyEntriesRoutes, {
    db,
    method: "POST",
    url: "/api/v1/food-entries/copy",
    session,
    body,
  });
const target = (session: SessionInfo, body: unknown) =>
  callRoute(makeNutritionTargetsRoutes, {
    db,
    method: "POST",
    url: "/api/v1/nutrition-targets",
    session,
    body,
  });

beforeEach(async () => {
  db = await createTestDb();
  owner = await insertUser(db, "owner");
  other = await insertUser(db, "other");
  const res = await callRoute(makeFoodsRoutes, {
    db,
    method: "POST",
    url: "/api/v1/foods",
    session: owner,
    body: { name: "Skyr", kcalPer100g: 62, proteinPer100g: 11 },
  });
  skyr = (res.body as { id: string }).id;
});

describe("journal (F-ALI-1, F-ALI-3, F-ALI-4)", () => {
  it("fige les valeurs d'une entrée, même si l'aliment est corrigé puis supprimé (Review Focus 4)", async () => {
    const created = await post(owner, {
      eatenOn: "2026-10-30",
      meal: "breakfast",
      foodId: skyr,
      quantityG: 150,
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ label: "Skyr", quantityG: 150, kcal: 93, proteinG: 16.5 });
    await callRoute(makeFoodRoutes, {
      db,
      method: "PATCH",
      url: `/api/v1/foods/${skyr}`,
      session: owner,
      body: { name: "Skyr corrigé", kcalPer100g: 100, proteinPer100g: 5 },
      params: { id: skyr },
    });
    await callRoute(makeFoodRoutes, {
      db,
      method: "DELETE",
      url: `/api/v1/foods/${skyr}`,
      session: owner,
      params: { id: skyr },
    });
    const day = await journal(owner, "2026-10-30");
    expect(day.entries).toEqual([
      expect.objectContaining({
        label: "Skyr",
        foodId: null,
        quantityG: 150,
        kcal: 93,
        proteinG: 16.5,
      }),
    ]);
  });

  it("modifie la quantité en proportion, et refuse des kcal sur une entrée avec aliment", async () => {
    const { id } = (
      await post(owner, { eatenOn: "2026-10-30", meal: "lunch", foodId: skyr, quantityG: 150 })
    ).body as {
      id: string;
    };
    expect((await one(owner, "PATCH", id, { quantityG: 300 })).body).toMatchObject({
      kcal: 186,
      proteinG: 33,
    });
    expect((await one(owner, "PATCH", id, { kcal: 10 })).status).toBe(400);
    const quick = (
      await post(owner, {
        eatenOn: "2026-10-30",
        meal: "dinner",
        label: "Pizza",
        kcal: 800,
        proteinG: 30,
      })
    ).body as { id: string };
    expect((await one(owner, "PATCH", quick.id, { quantityG: 100 })).status).toBe(400);
    expect((await one(owner, "PATCH", quick.id, { kcal: 900, meal: "snack" })).body).toMatchObject({
      kcal: 900,
      meal: "snack",
    });
    expect((await one(owner, "DELETE", quick.id)).status).toBe(204);
  });

  it("totalise la journée avec l'objectif en vigueur", async () => {
    await target(owner, { validFrom: "2026-10-01", kcal: 2400, proteinG: 150 });
    await target(owner, { validFrom: "2026-10-31", kcal: 2600, proteinG: 160 });
    await post(owner, { eatenOn: "2026-10-30", meal: "lunch", foodId: skyr, quantityG: 150 });
    await post(owner, {
      eatenOn: "2026-10-30",
      meal: "breakfast",
      label: "Café",
      kcal: 5,
      proteinG: 0,
    });
    const day = await journal(owner, "2026-10-30");
    expect(day.totals).toEqual({ kcal: 98, proteinG: 16.5 });
    expect(day.target).toEqual({ validFrom: "2026-10-01", kcal: 2400, proteinG: 150 });
    expect(day.entries.map((e) => e.meal)).toEqual(["breakfast", "lunch"]);
  });

  it("un objectif posé deux fois à la même date est remplacé", async () => {
    await target(owner, { validFrom: "2026-10-01", kcal: 2400, proteinG: 150 });
    expect(
      (await target(owner, { validFrom: "2026-10-01", kcal: 2500, proteinG: 155 })).status,
    ).toBe(200);
    const list = await callRoute(makeNutritionTargetsRoutes, {
      db,
      method: "GET",
      url: "/api/v1/nutrition-targets",
      session: owner,
    });
    expect(list.body).toEqual([{ validFrom: "2026-10-01", kcal: 2500, proteinG: 155 }]);
  });
});

describe("copie (F-ALI-7, Review Focus 5)", () => {
  it("ajoute un repas ou une journée à un jour qui a déjà des entrées", async () => {
    await post(owner, { eatenOn: "2026-10-29", meal: "breakfast", foodId: skyr, quantityG: 150 });
    await post(owner, {
      eatenOn: "2026-10-29",
      meal: "dinner",
      label: "Pâtes",
      kcal: 600,
      proteinG: 20,
    });
    await post(owner, {
      eatenOn: "2026-10-30",
      meal: "breakfast",
      label: "Café",
      kcal: 5,
      proteinG: 0,
    });
    expect(
      (await copy(owner, { fromDate: "2026-10-29", toDate: "2026-10-30", meal: "breakfast" })).body,
    ).toEqual({
      created: 1,
    });
    expect((await copy(owner, { fromDate: "2026-10-29", toDate: "2026-10-30" })).body).toEqual({
      created: 2,
    });
    const day = await journal(owner, "2026-10-30");
    expect(day.entries).toHaveLength(4);
    expect((await copy(owner, { fromDate: "2026-10-01", toDate: "2026-10-30" })).body).toEqual({
      created: 0,
    });
  });
});

describe("copie, ordre des entrées (revue du Lot 4)", () => {
  it("garde l'ordre des entrées de chaque repas", async () => {
    const labels = ["Café", "Pain", "Beurre", "Confiture", "Jus"];
    for (const label of labels) {
      await post(owner, { eatenOn: "2026-10-29", meal: "breakfast", label, kcal: 10, proteinG: 0 });
    }
    await copy(owner, { fromDate: "2026-10-29", toDate: "2026-10-30" });
    expect((await journal(owner, "2026-10-30")).entries.map((e) => e.label)).toEqual(labels);
  });
});

describe("isolation (T-01, T-02)", () => {
  it("ne lit, ne modifie ni n'utilise rien d'un autre utilisateur", async () => {
    const { id } = (
      await post(owner, { eatenOn: "2026-10-30", meal: "lunch", foodId: skyr, quantityG: 100 })
    ).body as {
      id: string;
    };
    expect((await journal(other, "2026-10-30")).entries).toEqual([]);
    expect((await one(other, "PATCH", id, { quantityG: 10 })).status).toBe(404);
    expect((await one(other, "DELETE", id)).status).toBe(404);
    expect(
      (await post(other, { eatenOn: "2026-10-30", meal: "lunch", foodId: skyr, quantityG: 100 }))
        .status,
    ).toBe(404);
    expect((await copy(other, { fromDate: "2026-10-30", toDate: "2026-10-31" })).body).toEqual({
      created: 0,
    });
    await target(owner, { validFrom: "2026-10-01", kcal: 2400, proteinG: 150 });
    expect((await journal(other, "2026-10-30")).target).toBeNull();
  });
  it("le compte démo n'écrit rien", async () => {
    const demo = { ...owner, isDemo: true };
    expect(
      (await post(demo, { eatenOn: "2026-10-30", meal: "lunch", label: "x", kcal: 1, proteinG: 1 }))
        .status,
    ).toBe(403);
    expect((await copy(demo, { fromDate: "2026-10-29", toDate: "2026-10-30" })).status).toBe(403);
    expect(
      (await target(demo, { validFrom: "2026-10-01", kcal: 2400, proteinG: 150 })).status,
    ).toBe(403);
  });
});
