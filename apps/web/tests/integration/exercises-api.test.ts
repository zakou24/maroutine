import { beforeEach, describe, expect, it } from "vitest";
import type { AppDatabase } from "@/db/client";
import type { SessionInfo } from "@/server/auth";
import { makeExerciseRoutes, makeExercisesRoutes } from "@/server/routes/exercises";
import * as exercisesRoute from "@/app/api/v1/exercises/route";
import * as exerciseRoute from "@/app/api/v1/exercises/[id]/route";
import { callRoute, insertUser } from "../helpers/api";
import { createTestDb } from "../helpers/test-db";

type ExerciseBody = { id: string; name: string; archived: boolean; repMin: number };

let db: AppDatabase;
let owner: SessionInfo;
let other: SessionInfo;

beforeEach(async () => {
  db = await createTestDb();
  owner = await insertUser(db, "owner");
  other = await insertUser(db, "other");
});

function create(session: SessionInfo, body: unknown) {
  return callRoute(makeExercisesRoutes, {
    db,
    method: "POST",
    url: "/api/v1/exercises",
    session,
    body,
  });
}

function list(session: SessionInfo, filter?: string) {
  return callRoute(makeExercisesRoutes, {
    db,
    method: "GET",
    url: `/api/v1/exercises${filter ? `?filter=${filter}` : ""}`,
    session,
  });
}

function one(session: SessionInfo, method: "GET" | "PATCH", id: string, body?: unknown) {
  return callRoute(makeExerciseRoutes, {
    db,
    method,
    url: `/api/v1/exercises/${id}`,
    session,
    body,
    params: { id },
  });
}

describe("API des exercices", () => {
  it("crée un exercice avec les valeurs par défaut : 201", async () => {
    const res = await create(owner, { name: " Squat ", equipment: "barbell" });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      name: "Squat",
      equipment: "barbell",
      repMin: 6,
      repMax: 10,
      incrementKg: 2.5,
      archived: false,
    });
  });

  it("refuse un doublon sans tenir compte de la casse : 409 duplicate_name", async () => {
    await create(owner, { name: "Squat", equipment: "barbell" });
    const res = await create(owner, { name: "squat", equipment: "machine" });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "duplicate_name" });
  });

  it("deux utilisateurs peuvent avoir un exercice du même nom", async () => {
    await create(owner, { name: "Squat", equipment: "barbell" });
    expect((await create(other, { name: "Squat", equipment: "barbell" })).status).toBe(201);
  });

  it("refuse un corps invalide : 400", async () => {
    expect((await create(owner, { name: "", equipment: "barbell" })).status).toBe(400);
  });

  it("liste les exercices actifs triés, sans les archivés", async () => {
    await create(owner, { name: "Squat", equipment: "barbell" });
    await create(owner, { name: "Développé couché", equipment: "barbell" });
    const curl = (await create(owner, { name: "Curl", equipment: "dumbbell" }))
      .body as ExerciseBody;
    await one(owner, "PATCH", curl.id, { archived: true });

    const active = (await list(owner)).body as ExerciseBody[];
    expect(active.map((e) => e.name)).toEqual(["Développé couché", "Squat"]);
    const archived = (await list(owner, "archived")).body as ExerciseBody[];
    expect(archived.map((e) => e.name)).toEqual(["Curl"]);
    expect(((await list(owner, "all")).body as ExerciseBody[]).length).toBe(3);
  });

  it("refuse un filtre inconnu : 400", async () => {
    expect((await list(owner, "tout")).status).toBe(400);
  });

  it("archive puis restaure un exercice", async () => {
    const squat = (await create(owner, { name: "Squat", equipment: "barbell" }))
      .body as ExerciseBody;
    const archived = await one(owner, "PATCH", squat.id, { archived: true });
    expect((archived.body as ExerciseBody).archived).toBe(true);
    const restored = await one(owner, "PATCH", squat.id, { archived: false });
    expect((restored.body as ExerciseBody).archived).toBe(false);
    expect(((await list(owner)).body as ExerciseBody[]).map((e) => e.name)).toEqual(["Squat"]);
  });

  it("modifie les réglages et relit l'exercice", async () => {
    const squat = (await create(owner, { name: "Squat", equipment: "barbell" }))
      .body as ExerciseBody;
    await one(owner, "PATCH", squat.id, { repMin: 5, repMax: 8, incrementKg: 1.25 });
    expect((await one(owner, "GET", squat.id)).body).toMatchObject({
      repMin: 5,
      repMax: 8,
      incrementKg: 1.25,
    });
  });

  it("refuse une fourchette incohérente après fusion du PATCH : 400", async () => {
    const squat = (await create(owner, { name: "Squat", equipment: "barbell" }))
      .body as ExerciseBody;
    const res = await one(owner, "PATCH", squat.id, { repMin: 12 });
    expect(res.status).toBe(400);
    expect((await one(owner, "GET", squat.id)).body).toMatchObject({ repMin: 6 });
  });

  it("refuse de renommer vers un nom déjà pris : 409", async () => {
    await create(owner, { name: "Squat", equipment: "barbell" });
    const curl = (await create(owner, { name: "Curl", equipment: "dumbbell" }))
      .body as ExerciseBody;
    expect((await one(owner, "PATCH", curl.id, { name: "SQUAT" })).status).toBe(409);
  });

  it("isolation (T-01) : l'exercice d'un autre utilisateur répond 404 en GET et en PATCH", async () => {
    const theirs = (await create(other, { name: "Squat", equipment: "barbell" }))
      .body as ExerciseBody;
    expect((await one(owner, "GET", theirs.id)).status).toBe(404);
    expect((await one(owner, "PATCH", theirs.id, { archived: true })).status).toBe(404);
    expect((await one(other, "GET", theirs.id)).body).toMatchObject({ archived: false });
  });

  it("un identifiant mal formé répond 404", async () => {
    expect((await one(owner, "GET", "42")).status).toBe(404);
  });

  it("isolation : la liste ne contient jamais les exercices d'un autre utilisateur", async () => {
    await create(other, { name: "Squat", equipment: "barbell" });
    expect((await list(owner)).body).toEqual([]);
  });

  it("aucune route DELETE n'existe", () => {
    expect("DELETE" in exerciseRoute).toBe(false);
    expect("DELETE" in exercisesRoute).toBe(false);
    expect(
      Object.keys(makeExerciseRoutes({ db: () => db, apiHandler: (h) => h as never })),
    ).not.toContain("DELETE");
  });
});
