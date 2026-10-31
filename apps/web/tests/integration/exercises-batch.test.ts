import type { Exercise } from "@maroutine/core";
import { beforeEach, describe, expect, it } from "vitest";
import type { AppDatabase } from "@/db/client";
import type { SessionInfo } from "@/server/auth";
import { makeExercisesBatchRoutes, makeExercisesRoutes } from "@/server/routes/exercises";
import { callRoute, insertUser } from "../helpers/api";
import { createTestDb } from "../helpers/test-db";

type BatchBody = { created: Exercise[]; existing: Exercise[] };

let db: AppDatabase;
let owner: SessionInfo;
let other: SessionInfo;

beforeEach(async () => {
  db = await createTestDb();
  owner = await insertUser(db, "owner");
  other = await insertUser(db, "other");
});

function batch(session: SessionInfo, exercises: unknown[]) {
  return callRoute(makeExercisesBatchRoutes, {
    db,
    method: "POST",
    url: "/api/v1/exercises/batch",
    session,
    body: { exercises },
  });
}

function createOne(session: SessionInfo, name: string) {
  return callRoute(makeExercisesRoutes, {
    db,
    method: "POST",
    url: "/api/v1/exercises",
    session,
    body: { name, equipment: "barbell" },
  });
}

describe("POST /api/v1/exercises/batch (D16)", () => {
  it("crée les nouveaux exercices et renvoie ceux qui existent déjà, sans 409", async () => {
    await createOne(owner, "Squat");
    const res = await batch(owner, [
      { name: "squat", equipment: "barbell" },
      { name: "Curl haltères", equipment: "dumbbell" },
      { name: "Presse à cuisses", equipment: "machine" },
    ]);
    expect(res.status).toBe(200);
    const body = res.body as BatchBody;
    expect(body.created.map((e) => [e.name, e.incrementKg])).toEqual([
      ["Curl haltères", 2],
      ["Presse à cuisses", 5],
    ]);
    expect(body.existing.map((e) => e.name)).toEqual(["Squat"]);
  });

  it("un même nom deux fois dans le lot n'est créé qu'une fois", async () => {
    const body = (
      await batch(owner, [
        { name: "Dips", equipment: "bodyweight" },
        { name: "DIPS", equipment: "bodyweight" },
      ])
    ).body as BatchBody;
    expect(body.created.map((e) => e.name)).toEqual(["Dips"]);
  });

  it("isolation : le lot ne voit pas les exercices d'un autre utilisateur", async () => {
    await createOne(other, "Squat");
    const body = (await batch(owner, [{ name: "Squat", equipment: "barbell" }])).body as BatchBody;
    expect(body.created.map((e) => e.name)).toEqual(["Squat"]);
    expect(body.existing).toEqual([]);
  });

  it("refuse un lot vide ou de plus de 50 exercices : 400", async () => {
    expect((await batch(owner, [])).status).toBe(400);
    const many = Array.from({ length: 51 }, (_, i) => ({ name: `Ex ${i}`, equipment: "other" }));
    expect((await batch(owner, many)).status).toBe(400);
  });
});
