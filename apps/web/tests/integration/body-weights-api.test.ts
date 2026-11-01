import { addDays, todayIn } from "@maroutine/core";
import { beforeEach, describe, expect, it } from "vitest";
import type { AppDatabase } from "@/db/client";
import type { SessionInfo } from "@/server/auth";
import { makeBodyWeightRoutes, makeBodyWeightsRoutes } from "@/server/routes/body-weights";
import { callRoute, insertUser } from "../helpers/api";
import { createTestDb, rowsOf } from "../helpers/test-db";
import { sql } from "drizzle-orm";

let db: AppDatabase;
let owner: SessionInfo;
let other: SessionInfo;
const today = todayIn("Europe/Paris", new Date());

function put(session: SessionInfo | null, date: string, weightKg: unknown) {
  return callRoute(makeBodyWeightRoutes, {
    db,
    method: "PUT",
    url: `/api/v1/body-weights/${date}`,
    session,
    body: { weightKg },
    params: { date },
  });
}
function remove(session: SessionInfo | null, date: string) {
  return callRoute(makeBodyWeightRoutes, {
    db,
    method: "DELETE",
    url: `/api/v1/body-weights/${date}`,
    session,
    params: { date },
  });
}
function list(session: SessionInfo | null, query = "") {
  return callRoute(makeBodyWeightsRoutes, {
    db,
    method: "GET",
    url: `/api/v1/body-weights${query}`,
    session,
  });
}

beforeEach(async () => {
  db = await createTestDb();
  owner = await insertUser(db, "owner");
  other = await insertUser(db, "other");
});

describe("API des pesées (F-POI-1)", () => {
  it("une nouvelle saisie le même jour remplace la précédente", async () => {
    expect(await put(owner, "2026-10-30", 78.4)).toEqual({
      status: 200,
      body: { date: "2026-10-30", weightKg: 78.4 },
    });
    await put(owner, "2026-10-30", 78.1);
    const rows = await rowsOf<{ n: number }>(db, sql`select count(*)::int as n from body_weight`);
    expect(rows[0]!.n).toBe(1);
    expect((await list(owner)).body).toEqual([{ date: "2026-10-30", weightKg: 78.1 }]);
  });

  it("refuse plus d'une décimale, les bornes, une date future ou impossible (Review Focus 2)", async () => {
    expect((await put(owner, "2026-10-30", 78.45)).status).toBe(400);
    expect((await put(owner, "2026-10-30", 19)).status).toBe(400);
    expect((await put(owner, "2026-10-30", "78,4")).status).toBe(400);
    expect((await put(owner, addDays(today, 1), 78)).status).toBe(400);
    expect((await put(owner, "2026-02-30", 78)).status).toBe(400);
    expect((await put(owner, today, 78)).status).toBe(200);
  });

  it("liste par période, triée par date, ou tout l'historique", async () => {
    for (const [date, kg] of [
      ["2026-10-03", 79],
      ["2026-10-01", 80],
      ["2026-10-10", 78],
    ] as const) {
      await put(owner, date, kg);
    }
    expect((await list(owner, "?from=2026-10-02&to=2026-10-10")).body).toEqual([
      { date: "2026-10-03", weightKg: 79 },
      { date: "2026-10-10", weightKg: 78 },
    ]);
    expect(
      ((await list(owner)).body as unknown[]).map((w) => (w as { date: string }).date),
    ).toEqual(["2026-10-01", "2026-10-03", "2026-10-10"]);
    expect((await list(owner, "?from=pas-une-date")).status).toBe(400);
  });

  it("supprime une pesée, et répond 204 même si elle n'existe pas", async () => {
    await put(owner, "2026-10-30", 78);
    expect((await remove(owner, "2026-10-30")).status).toBe(204);
    expect((await list(owner)).body).toEqual([]);
    expect((await remove(owner, "2026-10-29")).status).toBe(204);
  });
});

describe("isolation des pesées (T-01, T-02)", () => {
  it("un autre utilisateur ne lit ni n'efface les pesées", async () => {
    await put(owner, "2026-10-30", 78);
    expect((await list(other)).body).toEqual([]);
    await remove(other, "2026-10-30");
    expect((await list(owner)).body).toHaveLength(1);
  });
  it("le compte démo lit mais n'écrit pas ; sans session, 401", async () => {
    const demo = { ...owner, isDemo: true };
    expect((await put(demo, "2026-10-30", 78)).status).toBe(403);
    expect((await remove(demo, "2026-10-30")).status).toBe(403);
    expect((await list(demo)).status).toBe(200);
    expect((await list(null)).status).toBe(401);
    expect((await put(null, "2026-10-30", 78)).status).toBe(401);
  });
});
