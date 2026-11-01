import { sql } from "drizzle-orm";
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
    body: { name, muscleGroup: "legs", equipment: "barbell" },
  });
}

describe("POST /api/v1/exercises/batch (D16)", () => {
  it("crée les nouveaux exercices et renvoie ceux qui existent déjà, sans 409", async () => {
    await createOne(owner, "Squat");
    const res = await batch(owner, [
      { name: "squat", muscleGroup: "legs", equipment: "barbell" },
      { name: "Curl haltères", muscleGroup: "legs", equipment: "dumbbell" },
      { name: "Presse à cuisses", muscleGroup: "legs", equipment: "machine" },
    ]);
    expect(res.status).toBe(200);
    const body = res.body as BatchBody;
    expect(body.created.map((e) => [e.name, e.incrementKg])).toEqual([
      ["Curl haltères", 2],
      ["Presse à cuisses", 5],
    ]);
    expect(body.existing.map((e) => e.name)).toEqual(["Squat"]);
  });

  it("un exercice existant « Non classé » prend le groupe de l'entrée du catalogue (D27)", async () => {
    const id = ((await createOne(owner, "Curl barre")).body as { id: string }).id;
    await db.execute(sql`update exercise set muscle_group = null where id = ${id}`);
    const body = (
      await batch(owner, [{ name: "curl barre", muscleGroup: "biceps", equipment: "barbell" }])
    ).body as BatchBody;
    expect(body.existing).toEqual([expect.objectContaining({ id, muscleGroup: "biceps" })]);
  });

  it("un exercice existant déjà classé garde son groupe", async () => {
    await createOne(owner, "Squat");
    const body = (
      await batch(owner, [{ name: "Squat", muscleGroup: "back", equipment: "barbell" }])
    ).body as BatchBody;
    expect(body.existing[0]?.muscleGroup).toBe("legs");
  });

  it("un même nom deux fois dans le lot n'est créé qu'une fois", async () => {
    const body = (
      await batch(owner, [
        { name: "Dips", muscleGroup: "legs", equipment: "bodyweight" },
        { name: "DIPS", muscleGroup: "legs", equipment: "bodyweight" },
      ])
    ).body as BatchBody;
    expect(body.created.map((e) => e.name)).toEqual(["Dips"]);
  });

  it("isolation : le lot ne voit pas les exercices d'un autre utilisateur", async () => {
    await createOne(other, "Squat");
    const body = (
      await batch(owner, [{ name: "Squat", muscleGroup: "legs", equipment: "barbell" }])
    ).body as BatchBody;
    expect(body.created.map((e) => e.name)).toEqual(["Squat"]);
    expect(body.existing).toEqual([]);
  });

  it("refuse un lot vide ou de plus de 50 exercices : 400", async () => {
    expect((await batch(owner, [])).status).toBe(400);
    const many = Array.from({ length: 51 }, (_, i) => ({
      name: `Ex ${i}`,
      muscleGroup: "legs",
      equipment: "other",
    }));
    expect((await batch(owner, many)).status).toBe(400);
  });
});
