import type { Workout, WorkoutSummary } from "@maroutine/core";
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { AppDatabase } from "@/db/client";
import type { SessionInfo } from "@/server/auth";
import { makeExerciseRoutes, makeExercisesRoutes } from "@/server/routes/exercises";
import {
  makeLastSetsRoutes,
  makeWorkoutRoutes,
  makeWorkoutsRoutes,
} from "@/server/routes/workouts";
import { callRoute, insertUser } from "../helpers/api";
import { createTestDb, rowsOf } from "../helpers/test-db";

let db: AppDatabase;
let owner: SessionInfo;
let other: SessionInfo;
let squat: string;
let bench: string;

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

const sets = (...pairs: [number, number][]) =>
  pairs.map(([weightKg, reps]) => ({ weightKg, reps }));

function create(session: SessionInfo, body: unknown) {
  return callRoute(makeWorkoutsRoutes, {
    db,
    method: "POST",
    url: "/api/v1/workouts",
    session,
    body,
  });
}

function list(session: SessionInfo, query: string) {
  return callRoute(makeWorkoutsRoutes, {
    db,
    method: "GET",
    url: `/api/v1/workouts?${query}`,
    session,
  });
}

function one(session: SessionInfo, method: "GET" | "PUT" | "DELETE", id: string, body?: unknown) {
  return callRoute(makeWorkoutRoutes, {
    db,
    method,
    url: `/api/v1/workouts/${id}`,
    session,
    body,
    params: { id },
  });
}

function lastSets(session: SessionInfo, exerciseId: string, before?: string) {
  return callRoute(makeLastSetsRoutes, {
    db,
    method: "GET",
    url: `/api/v1/exercises/${exerciseId}/last-sets${before ? `?before=${before}` : ""}`,
    session,
    params: { id: exerciseId },
  });
}

async function count(table: string) {
  const rows = await rowsOf<{ n: number }>(db, sql.raw(`select count(*)::int as n from ${table}`));
  return rows[0]?.n;
}

beforeEach(async () => {
  db = await createTestDb();
  owner = await insertUser(db, "owner");
  other = await insertUser(db, "other");
  squat = await newExercise(owner, "Squat");
  bench = await newExercise(owner, "Développé couché");
});

describe("API des séances", () => {
  it("crée une séance complète et la relit à l'identique", async () => {
    const input = {
      performedOn: "2026-10-30",
      note: "Bonne séance",
      exercises: [
        {
          exerciseId: bench,
          sets: [{ weightKg: 40, reps: 10, isWarmup: true }, ...sets([62.5, 8], [62.5, 7])],
        },
        { exerciseId: squat, sets: sets([80, 6], [80, 6], [80, 5]) },
      ],
    };
    const res = await create(owner, input);
    expect(res.status).toBe(201);
    const created = res.body as Workout;
    const read = (await one(owner, "GET", created.id)).body as Workout;
    expect(read).toEqual(created);
    expect(read).toEqual({
      id: expect.any(String),
      performedOn: "2026-10-30",
      note: "Bonne séance",
      warmupDone: false,
      cardioMinutes: null,
      muscleGroups: [],
      exercises: [
        {
          exerciseId: bench,
          name: "Développé couché",
          archived: false,
          sets: [
            { weightKg: 40, reps: 10, isWarmup: true },
            { weightKg: 62.5, reps: 8, isWarmup: false },
            { weightKg: 62.5, reps: 7, isWarmup: false },
          ],
        },
        {
          exerciseId: squat,
          name: "Squat",
          archived: false,
          sets: [
            { weightKg: 80, reps: 6, isWarmup: false },
            { weightKg: 80, reps: 6, isWarmup: false },
            { weightKg: 80, reps: 5, isWarmup: false },
          ],
        },
      ],
    });
  });

  it("une séance avec échauffement et 15 min de cardio se relit à l'identique (D14, D15)", async () => {
    const created = (
      await create(owner, {
        performedOn: "2026-10-30",
        warmupDone: true,
        cardioMinutes: 15,
        exercises: [{ exerciseId: squat, sets: sets([80, 6]) }],
      })
    ).body as Workout;
    expect(created).toMatchObject({ warmupDone: true, cardioMinutes: 15 });
    expect((await one(owner, "GET", created.id)).body).toEqual(created);
    const updated = await one(owner, "PUT", created.id, {
      performedOn: "2026-10-30",
      exercises: [{ exerciseId: squat, sets: sets([80, 6]) }],
    });
    expect(updated.body).toMatchObject({ warmupDone: false, cardioMinutes: null });
    const summaries = (await list(owner, "from=2026-10-30&to=2026-10-30")).body as WorkoutSummary[];
    expect(summaries[0]).toMatchObject({ warmupDone: false, cardioMinutes: null });
  });

  it("enregistre les muscles travaillés, rangés, dans le détail et le résumé (D28)", async () => {
    const created = (
      await create(owner, {
        performedOn: "2026-10-30",
        muscleGroups: ["triceps", "shoulders"],
        exercises: [{ exerciseId: squat, sets: sets([80, 6]) }],
      })
    ).body as Workout;
    expect(created.muscleGroups).toEqual(["shoulders", "triceps"]);
    expect((await one(owner, "GET", created.id)).body).toMatchObject({
      muscleGroups: ["shoulders", "triceps"],
    });
    const summaries = (await list(owner, "from=2026-10-30&to=2026-10-30")).body as WorkoutSummary[];
    expect(summaries[0]?.muscleGroups).toEqual(["shoulders", "triceps"]);

    const cleared = await one(owner, "PUT", created.id, {
      performedOn: "2026-10-30",
      muscleGroups: [],
      exercises: [{ exerciseId: squat, sets: sets([80, 6]) }],
    });
    expect((cleared.body as Workout).muscleGroups).toEqual([]);
    const bad = await create(owner, {
      performedOn: "2026-10-30",
      muscleGroups: ["arms"],
      exercises: [{ exerciseId: squat, sets: sets([80, 6]) }],
    });
    expect(bad.status).toBe(400);
  });

  it("refuse une durée de cardio hors de 1 à 180 minutes : 400", async () => {
    const res = await create(owner, {
      performedOn: "2026-10-30",
      cardioMinutes: 0,
      exercises: [{ exerciseId: squat, sets: sets([80, 6]) }],
    });
    expect(res.status).toBe(400);
  });

  it("une note vide est enregistrée comme absente", async () => {
    const res = await create(owner, {
      performedOn: "2026-10-30",
      note: "   ",
      exercises: [{ exerciseId: squat, sets: sets([80, 6]) }],
    });
    expect((res.body as Workout).note).toBeNull();
  });

  it("un POST rejoué avec le même id ne crée qu'une séance (réponse perdue, Review Focus 4)", async () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const body = {
      id,
      performedOn: "2026-10-30",
      exercises: [{ exerciseId: squat, sets: sets([80, 6]) }],
    };
    const first = await create(owner, body);
    const second = await create(owner, body);
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect((first.body as Workout).id).toBe(id);
    expect(second.body).toEqual(first.body);
    expect(await count("workout")).toBe(1);
    expect(await count("workout_set")).toBe(1);
  });

  it("un id de séance déjà pris par un autre utilisateur : 404, rien n'est écrit", async () => {
    const theirSquat = await newExercise(other, "Squat");
    const id = "22222222-2222-4222-8222-222222222222";
    await create(other, {
      id,
      performedOn: "2026-10-30",
      exercises: [{ exerciseId: theirSquat, sets: sets([1, 1]) }],
    });
    const res = await create(owner, {
      id,
      performedOn: "2026-10-30",
      exercises: [{ exerciseId: squat, sets: sets([80, 6]) }],
    });
    expect(res.status).toBe(404);
    expect(await count("workout")).toBe(1);
  });

  it("deux séances le même jour restent distinctes (F-SEA-6)", async () => {
    const body = {
      performedOn: "2026-10-30",
      exercises: [{ exerciseId: squat, sets: sets([80, 6]) }],
    };
    const a = (await create(owner, body)).body as Workout;
    const b = (await create(owner, body)).body as Workout;
    expect(a.id).not.toBe(b.id);
    const summaries = (await list(owner, "from=2026-10-30&to=2026-10-30")).body as WorkoutSummary[];
    expect(summaries.map((s) => s.id)).toEqual([a.id, b.id]);
  });

  it("PUT remplace exercices et séries, sans laisser de série orpheline", async () => {
    const created = (
      await create(owner, {
        performedOn: "2026-10-30",
        exercises: [
          { exerciseId: squat, sets: sets([80, 6], [80, 6]) },
          { exerciseId: bench, sets: sets([60, 8]) },
        ],
      })
    ).body as Workout;
    const res = await one(owner, "PUT", created.id, {
      performedOn: "2026-10-29",
      note: "corrigée",
      exercises: [{ exerciseId: bench, sets: sets([62.5, 8], [62.5, 8], [62.5, 6]) }],
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: created.id, performedOn: "2026-10-29", note: "corrigée" });
    expect((res.body as Workout).exercises.map((e) => e.exerciseId)).toEqual([bench]);
    expect(await count("workout_exercise")).toBe(1);
    expect(await count("workout_set")).toBe(3);
  });

  it("PUT qui échoue à mi-chemin ne modifie rien (transaction)", async () => {
    const created = (
      await create(owner, {
        performedOn: "2026-10-30",
        exercises: [{ exerciseId: squat, sets: sets([80, 6]) }],
      })
    ).body as Workout;
    const unknown = "00000000-0000-4000-8000-000000000999";
    const res = await one(owner, "PUT", created.id, {
      performedOn: "2026-10-29",
      exercises: [
        { exerciseId: bench, sets: sets([60, 8]) },
        { exerciseId: unknown, sets: sets([60, 8]) },
      ],
    });
    expect(res.status).toBe(404);
    expect((await one(owner, "GET", created.id)).body).toEqual(created);
  });

  it("DELETE supprime la séance, ses exercices et ses séries : 204", async () => {
    const created = (
      await create(owner, {
        performedOn: "2026-10-30",
        exercises: [{ exerciseId: squat, sets: sets([80, 6], [80, 6]) }],
      })
    ).body as Workout;
    const res = await one(owner, "DELETE", created.id);
    expect(res.status).toBe(204);
    expect(res.body).toBeUndefined();
    expect((await one(owner, "GET", created.id)).status).toBe(404);
    expect(await count("workout_exercise")).toBe(0);
    expect(await count("workout_set")).toBe(0);
  });

  it("isolation : séance d'un autre utilisateur → 404 en GET, PUT et DELETE", async () => {
    const theirSquat = await newExercise(other, "Squat");
    const theirs = (
      await create(other, {
        performedOn: "2026-10-30",
        exercises: [{ exerciseId: theirSquat, sets: sets([100, 5]) }],
      })
    ).body as Workout;
    expect((await one(owner, "GET", theirs.id)).status).toBe(404);
    const put = await one(owner, "PUT", theirs.id, {
      performedOn: "2026-10-30",
      exercises: [{ exerciseId: squat, sets: sets([1, 1]) }],
    });
    expect(put.status).toBe(404);
    expect((await one(owner, "DELETE", theirs.id)).status).toBe(404);
    expect((await one(other, "GET", theirs.id)).body).toEqual(theirs);
  });

  it("isolation : exerciseId d'un autre utilisateur dans le corps → 404 et rien n'est écrit (T-01)", async () => {
    const theirSquat = await newExercise(other, "Squat");
    const res = await create(owner, {
      performedOn: "2026-10-30",
      exercises: [{ exerciseId: theirSquat, sets: sets([80, 6]) }],
    });
    expect(res.status).toBe(404);
    expect(await count("workout")).toBe(0);
    expect(await count("workout_set")).toBe(0);
  });

  it("un exercice archivé reste lisible dans les séances passées, avec son nom", async () => {
    const created = (
      await create(owner, {
        performedOn: "2026-10-30",
        exercises: [{ exerciseId: squat, sets: sets([80, 6]) }],
      })
    ).body as Workout;
    await callRoute(makeExerciseRoutes, {
      db,
      method: "PATCH",
      url: `/api/v1/exercises/${squat}`,
      session: owner,
      body: { archived: true },
      params: { id: squat },
    });
    const read = (await one(owner, "GET", created.id)).body as Workout;
    expect(read.exercises[0]).toMatchObject({ name: "Squat", archived: true });
    expect((await lastSets(owner, squat)).body).toMatchObject({ performedOn: "2026-10-30" });
  });

  it("listWorkouts compte les séries de travail sans les échauffements", async () => {
    await create(owner, {
      performedOn: "2026-10-28",
      exercises: [
        {
          exerciseId: squat,
          sets: [{ weightKg: 40, reps: 10, isWarmup: true }, ...sets([80, 6], [80, 6])],
        },
        { exerciseId: bench, sets: sets([60, 8]) },
      ],
    });
    await create(owner, {
      performedOn: "2026-11-02",
      exercises: [{ exerciseId: squat, sets: sets([80, 6]) }],
    });
    const summaries = (await list(owner, "from=2026-10-26&to=2026-11-01")).body as WorkoutSummary[];
    expect(summaries).toEqual([
      {
        id: expect.any(String),
        performedOn: "2026-10-28",
        exerciseCount: 2,
        workingSetCount: 3,
        warmupDone: false,
        cardioMinutes: null,
        muscleGroups: [],
      },
    ]);
  });

  it("la liste ne contient jamais les séances d'un autre utilisateur", async () => {
    const theirSquat = await newExercise(other, "Squat");
    await create(other, {
      performedOn: "2026-10-30",
      exercises: [{ exerciseId: theirSquat, sets: sets([1, 1]) }],
    });
    expect((await list(owner, "from=2026-10-01&to=2026-10-31")).body).toEqual([]);
  });

  it("GET /workouts sans from ou au-delà de 400 jours : 400", async () => {
    expect((await list(owner, "to=2026-10-31")).status).toBe(400);
    expect((await list(owner, "from=2025-01-01&to=2026-10-31")).status).toBe(400);
    expect((await list(owner, "from=2026-10-31&to=2026-10-01")).status).toBe(400);
    expect((await list(owner, "from=2025-10-01&to=2026-11-04")).status).toBe(200);
  });
});

describe("préremplissage (last-sets)", () => {
  async function workoutOn(performedOn: string, weightKg: number) {
    return (
      await create(owner, {
        performedOn,
        exercises: [
          {
            exerciseId: squat,
            sets: [
              { weightKg: 40, reps: 10, isWarmup: true },
              ...sets([weightKg, 6], [weightKg, 5]),
            ],
          },
        ],
      })
    ).body as Workout;
  }

  it("last-sets ignore les anciennes séries d'échauffement (D14)", async () => {
    await workoutOn("2026-10-20", 75);
    await workoutOn("2026-10-27", 80);
    await create(owner, {
      performedOn: "2026-10-29",
      exercises: [{ exerciseId: bench, sets: sets([60, 8]) }],
    });
    expect((await lastSets(owner, squat)).body).toEqual({
      performedOn: "2026-10-27",
      sets: [
        { weightKg: 80, reps: 6, isWarmup: false },
        { weightKg: 80, reps: 5, isWarmup: false },
      ],
    });
  });

  it("last-sets avec before ignore la séance du jour même et les suivantes", async () => {
    await workoutOn("2026-10-20", 75);
    await workoutOn("2026-10-27", 80);
    await workoutOn("2026-10-30", 82.5);
    const res = (await lastSets(owner, squat, "2026-10-27")).body as { performedOn: string };
    expect(res.performedOn).toBe("2026-10-20");
  });

  it("last-sets d'un exercice jamais fait : { performedOn: null, sets: [] }", async () => {
    expect((await lastSets(owner, squat)).body).toEqual({ performedOn: null, sets: [] });
  });

  it("last-sets d'un exercice d'un autre utilisateur : 404", async () => {
    const theirSquat = await newExercise(other, "Squat");
    expect((await lastSets(owner, theirSquat)).status).toBe(404);
  });

  it("last-sets avec une date invalide : 400", async () => {
    expect((await lastSets(owner, squat, "2026-02-30")).status).toBe(400);
  });
});
