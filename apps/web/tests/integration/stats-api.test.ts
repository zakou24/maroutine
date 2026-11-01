import { addDays, todayIn } from "@maroutine/core";
import { beforeEach, describe, expect, it } from "vitest";
import type { AppDatabase } from "@/db/client";
import type { SessionInfo } from "@/server/auth";
import { makeBodyWeightRoutes } from "@/server/routes/body-weights";
import { makeExerciseRoutes, makeExercisesRoutes } from "@/server/routes/exercises";
import {
  makeExerciseStatsRoutes,
  makeExerciseTrendsRoutes,
  makeSuggestionRoutes,
} from "@/server/routes/stats";
import { makeWorkoutsRoutes } from "@/server/routes/workouts";
import { callRoute, insertUser } from "../helpers/api";
import { createTestDb } from "../helpers/test-db";

let db: AppDatabase;
let owner: SessionInfo;
let other: SessionInfo;
let squat: string;
const today = todayIn("Europe/Paris", new Date());
const daysAgo = (n: number) => addDays(today, -n);

async function newExercise(session: SessionInfo, name: string, extra: object = {}) {
  const res = await callRoute(makeExercisesRoutes, {
    db,
    method: "POST",
    url: "/api/v1/exercises",
    session,
    body: { name, equipment: "barbell", ...extra },
  });
  return (res.body as { id: string }).id;
}

async function workoutOn(performedOn: string, exerciseId: string, weightKg: number, reps = 5) {
  const res = await callRoute(makeWorkoutsRoutes, {
    db,
    method: "POST",
    url: "/api/v1/workouts",
    session: owner,
    body: { performedOn, exercises: [{ exerciseId, sets: [{ weightKg, reps }] }] },
  });
  return (res.body as { id: string }).id;
}

const get = <R extends Record<string, unknown>>(
  routes: (deps: never) => R,
  session: SessionInfo | null,
  url: string,
  id?: string,
) =>
  callRoute(routes as never, {
    db,
    method: "GET" as never,
    url,
    session,
    params: id ? { id } : undefined,
  });

const stats = (session: SessionInfo | null, id: string, query = "") =>
  get(makeExerciseStatsRoutes, session, `/api/v1/exercises/${id}/stats${query}`, id);
const suggestion = (session: SessionInfo | null, id: string, query = "") =>
  get(makeSuggestionRoutes, session, `/api/v1/exercises/${id}/suggestion${query}`, id);
const trends = (session: SessionInfo | null) =>
  get(makeExerciseTrendsRoutes, session, "/api/v1/exercises/trends");

beforeEach(async () => {
  db = await createTestDb();
  owner = await insertUser(db, "owner");
  other = await insertUser(db, "other");
  squat = await newExercise(owner, "Squat");
});

describe("GET /api/v1/exercises/{id}/stats", () => {
  it("calcule tendance, dernière séance et séances de la période", async () => {
    // 6 séances progressives, dont une il y a plus d'un mois.
    for (const [i, kg] of [100, 100, 100, 105, 105, 110].entries()) {
      await workoutOn(daysAgo(50 - i * 9), squat, kg);
    }
    const res = await stats(owner, squat, "?period=1m");
    expect(res.status).toBe(200);
    const body = res.body as {
      trend: string;
      latest: { estimatedMax: number; bestSet: unknown; volumeKg: number };
      sessions: { performedOn: string }[];
      corridor: { performedOn: string; low: number; high: number }[];
    };
    expect(body.trend).toBe("progressing");
    expect(body.latest.bestSet).toEqual({ weightKg: 110, reps: 5 });
    expect(body.latest.estimatedMax).toBeCloseTo(110 * (1 + 5 / 30), 5);
    expect(body.latest.volumeKg).toBe(550);
    expect(body.sessions.map((s) => s.performedOn)).toEqual([daysAgo(23), daysAgo(14), daysAgo(5)]);
    // Le couloir est calculé sur tout l'historique, puis coupé à la période.
    expect(body.corridor).toHaveLength(3);
    expect(body.corridor[0]!.low).toBeCloseTo(100 * (1 + 5 / 30), 5);
    const all = await stats(owner, squat, "?period=all");
    expect((all.body as { sessions: unknown[] }).sessions).toHaveLength(6);
  });

  it("prend 3 mois par défaut et refuse une période inconnue", async () => {
    await workoutOn(daysAgo(100), squat, 100);
    await workoutOn(daysAgo(10), squat, 100);
    const res = await stats(owner, squat);
    expect((res.body as { sessions: unknown[]; trend: string }).sessions).toHaveLength(1);
    expect((res.body as { trend: string }).trend).toBe("insufficient");
    expect((await stats(owner, squat, "?period=2w")).status).toBe(400);
  });

  it("répond vide pour un exercice sans séance", async () => {
    const res = await stats(owner, squat);
    expect(res.body).toEqual({ trend: "insufficient", latest: null, sessions: [], corridor: [] });
  });
});

describe("GET /api/v1/exercises/{id}/suggestion", () => {
  it("suit la dernière séance avant la date, la plus récente le même jour", async () => {
    await workoutOn(daysAgo(3), squat, 100, 5);
    await workoutOn(daysAgo(3), squat, 102.5, 6);
    const res = await suggestion(owner, squat, `?before=${daysAgo(2)}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      suggestion: { rule: "add-rep", weightKg: 102.5, reps: 7, done: { weightKg: 102.5, reps: 6 } },
      text: "Tu as fait 102,5 × 6 : vise 102,5 × 7.",
    });
  });

  it("exclut les séances du jour même passé en `before`", async () => {
    await workoutOn(daysAgo(1), squat, 100, 5);
    const res = await suggestion(owner, squat, `?before=${daysAgo(1)}`);
    expect((res.body as { suggestion: unknown }).suggestion).toEqual({ rule: "first" });
  });
});

describe("GET /api/v1/exercises/trends", () => {
  it("liste la tendance et le dernier max des exercices actifs de la session", async () => {
    await workoutOn(daysAgo(1), squat, 100, 1);
    const archived = await newExercise(owner, "Ancien");
    await callRoute(makeExerciseRoutes, {
      db,
      method: "PATCH",
      url: `/api/v1/exercises/${archived}`,
      session: owner,
      body: { archived: true },
      params: { id: archived },
    });
    await newExercise(other, "Squat");
    const res = await trends(owner);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { exerciseId: squat, trend: "insufficient", latestMax: 100, approximate: false },
    ]);
  });
});

describe("isolation et accès", () => {
  it("cache l'exercice d'un autre utilisateur (T-01)", async () => {
    expect((await stats(other, squat)).status).toBe(404);
    expect((await suggestion(other, squat)).status).toBe(404);
    expect((await stats(owner, "pas-un-uuid")).status).toBe(404);
  });
  it("exige une session et laisse le compte démo lire", async () => {
    expect((await stats(null, squat)).status).toBe(401);
    expect((await trends(null)).status).toBe(401);
    const demo = { ...owner, isDemo: true };
    expect((await stats(demo, squat)).status).toBe(200);
    expect((await suggestion(demo, squat)).status).toBe(200);
  });
});

describe("exercice au poids du corps avec les pesées (C5, Lot 3)", () => {
  async function weighIn(date: string, weightKg: number) {
    await callRoute(makeBodyWeightRoutes, {
      db,
      method: "PUT",
      url: `/api/v1/body-weights/${date}`,
      session: owner,
      body: { weightKg },
      params: { date },
    });
  }

  it("ajoute la pesée de J-14 au lest, mais pas celle de J-15", async () => {
    const dips = await newExercise(owner, "Dips", { equipment: "bodyweight" });
    // Séance d'hier (J) : J-15 = il y a 16 jours, J-14 = il y a 15 jours.
    await workoutOn(daysAgo(1), dips, 10, 5);
    await weighIn(daysAgo(16), 80);
    const without = await stats(owner, dips);
    expect(
      (without.body as { latest: { estimatedMax: number | null } }).latest.estimatedMax,
    ).toBeNull();
    await weighIn(daysAgo(15), 80);
    const withWeight = await stats(owner, dips);
    expect(
      (withWeight.body as { latest: { estimatedMax: number } }).latest.estimatedMax,
    ).toBeCloseTo(90 * (1 + 5 / 30), 5);
    const list = (await trends(owner)).body as { exerciseId: string; latestMax: number | null }[];
    expect(list.find((t) => t.exerciseId === dips)!.latestMax).toBeCloseTo(90 * (1 + 5 / 30), 5);
  });
});
