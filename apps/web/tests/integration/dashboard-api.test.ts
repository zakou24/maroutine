import {
  addDays,
  type CrossingResponse,
  type NextSuggestions,
  type NutritionDay,
} from "@maroutine/core";
import { beforeEach, describe, expect, it } from "vitest";
import type { AppDatabase } from "@/db/client";
import type { SessionInfo } from "@/server/auth";
import { makeExerciseRoutes, makeExercisesRoutes } from "@/server/routes/exercises";
import { makeFoodEntriesRoutes } from "@/server/routes/food-entries";
import { makeNutritionDaysRoutes } from "@/server/routes/nutrition-days";
import { makeNutritionTargetsRoutes } from "@/server/routes/nutrition-targets";
import { makeCrossingRoutes, makeNextSuggestionsRoutes } from "@/server/routes/stats";
import { makeWorkoutsRoutes } from "@/server/routes/workouts";
import { callRoute, insertUser } from "../helpers/api";
import { createTestDb } from "../helpers/test-db";

let db: AppDatabase;
let owner: SessionInfo;
let other: SessionInfo;
const demo = (): SessionInfo => ({ userId: owner.userId, isDemo: true });

beforeEach(async () => {
  db = await createTestDb();
  owner = await insertUser(db, "owner");
  other = await insertUser(db, "other");
});

async function newExercise(session: SessionInfo, name: string) {
  const res = await callRoute(makeExercisesRoutes, {
    db,
    method: "POST",
    url: "/api/v1/exercises",
    session,
    body: { name, muscleGroup: "legs", equipment: "barbell" },
  });
  return (res.body as { id: string }).id;
}

async function workout(
  session: SessionInfo,
  performedOn: string,
  exercises: { id: string; kg: number }[],
) {
  const res = await callRoute(makeWorkoutsRoutes, {
    db,
    method: "POST",
    url: "/api/v1/workouts",
    session,
    body: {
      performedOn,
      exercises: exercises.map((e) => ({ exerciseId: e.id, sets: [{ weightKg: e.kg, reps: 1 }] })),
    },
  });
  return (res.body as { id: string }).id;
}

const eat = (session: SessionInfo, eatenOn: string, kcal: number, proteinG: number) =>
  callRoute(makeFoodEntriesRoutes, {
    db,
    method: "POST",
    url: "/api/v1/food-entries",
    session,
    body: { eatenOn, meal: "lunch", label: "Repas", kcal, proteinG },
  });

const target = (session: SessionInfo, validFrom: string, kcal: number, proteinG: number) =>
  callRoute(makeNutritionTargetsRoutes, {
    db,
    method: "POST",
    url: "/api/v1/nutrition-targets",
    session,
    body: { validFrom, kcal, proteinG },
  });

const days = (session: SessionInfo, query: string) =>
  callRoute(makeNutritionDaysRoutes, {
    db,
    method: "GET",
    url: `/api/v1/nutrition/days?${query}`,
    session,
  });
const crossingOf = (session: SessionInfo) =>
  callRoute(makeCrossingRoutes, { db, method: "GET", url: "/api/v1/stats/crossing", session });
const nextOf = (session: SessionInfo) =>
  callRoute(makeNextSuggestionsRoutes, { db, method: "GET", url: "/api/v1/stats/next", session });

describe("GET /api/v1/nutrition/days (§6.7)", () => {
  it("un élément par jour, jours vides compris, avec l'objectif en vigueur chaque jour", async () => {
    await target(owner, "2026-10-01", 2400, 150);
    await target(owner, "2026-10-29", 2000, 120);
    await eat(owner, "2026-10-28", 1200, 70);
    await eat(owner, "2026-10-28", 1200, 80);
    await eat(owner, "2026-10-29", 2400, 150);
    const res = await days(owner, "from=2026-10-27&to=2026-10-29");
    expect(res.status).toBe(200);
    expect(res.body as NutritionDay[]).toEqual([
      {
        date: "2026-10-27",
        kcal: 0,
        proteinG: 0,
        entryCount: 0,
        target: { kcal: 2400, proteinG: 150 },
        status: "unrecorded",
      },
      {
        date: "2026-10-28",
        kcal: 2400,
        proteinG: 150,
        entryCount: 2,
        target: { kcal: 2400, proteinG: 150 },
        status: "engaged",
      },
      // 2400 kcal pour un objectif de 2000 : au-delà de 110 %.
      {
        date: "2026-10-29",
        kcal: 2400,
        proteinG: 150,
        entryCount: 1,
        target: { kcal: 2000, proteinG: 120 },
        status: "notEngaged",
      },
    ]);
  });

  it("sans objectif : non évalué ; et rien d'un autre utilisateur (T-01)", async () => {
    await eat(other, "2026-10-28", 2400, 150);
    await eat(owner, "2026-10-28", 900, 40);
    const body = (await days(owner, "from=2026-10-28&to=2026-10-28")).body as NutritionDay[];
    expect(body).toEqual([
      expect.objectContaining({ kcal: 900, entryCount: 1, target: null, status: "unrated" }),
    ]);
  });

  it("refuse une plage à l'envers, absente ou de plus de 400 jours : 400", async () => {
    expect((await days(owner, "from=2026-10-29&to=2026-10-28")).status).toBe(400);
    expect((await days(owner, "from=2026-10-29")).status).toBe(400);
    expect((await days(owner, "from=2025-01-01&to=2026-10-28")).status).toBe(400);
  });

  it("le compte démo lit (200)", async () => {
    expect((await days(demo(), "from=2026-10-28&to=2026-10-28")).status).toBe(200);
  });
});

describe("GET /api/v1/stats/crossing (§6.8, F-TDB-3, F-TDB-4)", () => {
  // Une séance tous les 4 jours : chaque fenêtre (J-3 à J-1) tombe entre deux séances.
  async function history(session: SessionInfo, count: number, start = "2026-08-01") {
    const squat = await newExercise(session, "Squat");
    await target(session, "2026-01-01", 2400, 150);
    let kg = 100;
    for (let i = 0; i <= count; i++) {
      const day = addDays(start, i * 4);
      const engaged = i % 2 === 1;
      for (const d of [1, 2, 3]) {
        await eat(session, addDays(day, -d), engaged ? 2400 : 1500, engaged ? 150 : 80);
      }
      if (i > 0) kg = engaged ? kg + 2 : kg - 1;
      await workout(session, day, [{ id: squat, kg }]);
    }
    return squat;
  }

  it("au-dessus du seuil : moyennes, progressions et séances, tous exercices et par exercice", async () => {
    const squat = await history(owner, 10);
    const res = await crossingOf(owner);
    expect(res.status).toBe(200);
    const body = res.body as CrossingResponse;
    expect(body.all.enough).toBe(true);
    expect(body.all.engaged).toMatchObject({ progressions: 5, sessions: 5, missing: 0 });
    expect(body.all.notEngaged).toMatchObject({ progressions: 5, sessions: 5, missing: 0 });
    expect(body.all.engaged.mean).toBeGreaterThan(0.015);
    expect(body.all.notEngaged.mean).toBeLessThan(0);
    expect(body.byExercise).toEqual([{ exerciseId: squat, name: "Squat", crossing: body.all }]);
  });

  it("sous le seuil : aucune moyenne dans la réponse (Review Focus 3)", async () => {
    await history(owner, 8);
    const res = await crossingOf(owner);
    const body = res.body as CrossingResponse;
    expect(body.all.enough).toBe(false);
    expect(body.all.engaged.missing).toBe(1);
    expect(JSON.stringify(body)).not.toMatch(/"mean":-?\d/);
  });

  it("isolation : rien d'un autre utilisateur, et le compte démo lit", async () => {
    await history(other, 10);
    const body = (await crossingOf(owner)).body as CrossingResponse;
    expect(body.all.engaged.progressions).toBe(0);
    expect(body.byExercise).toEqual([]);
    expect((await crossingOf(demo())).status).toBe(200);
  });
});

describe("GET /api/v1/stats/next (F-TDB-1)", () => {
  it("les suggestions des exercices de la dernière séance, dans son ordre, sans les archivés", async () => {
    const squat = await newExercise(owner, "Squat");
    const bench = await newExercise(owner, "Développé couché");
    const row = await newExercise(owner, "Rowing");
    await workout(owner, "2026-10-20", [{ id: squat, kg: 100 }]);
    await workout(owner, "2026-10-28", [
      { id: bench, kg: 60 },
      { id: row, kg: 50 },
      { id: squat, kg: 102.5 },
    ]);
    await callRoute(makeExerciseRoutes, {
      db,
      method: "PATCH",
      url: `/api/v1/exercises/${row}`,
      session: owner,
      body: { archived: true },
      params: { id: row },
    });
    const body = (await nextOf(owner)).body as NextSuggestions;
    expect(body.performedOn).toBe("2026-10-28");
    expect(body.items.map((i) => [i.name, i.equipment])).toEqual([
      ["Développé couché", "barbell"],
      ["Squat", "barbell"],
    ]);
    expect(body.items[0]!.text).toEqual(expect.any(String));
  });

  it("sans séance : une liste vide ; isolation ; le compte démo lit", async () => {
    const squat = await newExercise(other, "Squat");
    await workout(other, "2026-10-28", [{ id: squat, kg: 100 }]);
    expect((await nextOf(owner)).body).toEqual({ workoutId: null, performedOn: null, items: [] });
    expect((await nextOf(demo())).status).toBe(200);
  });
});
