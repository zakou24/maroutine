import type { Equipment, Exercise, ExerciseInput, ExercisePatch } from "@maroutine/core";
import { and, eq, type SQL } from "drizzle-orm";
import type { AppDatabase } from "@/db/client";
import { exercise } from "@/db/schema";
import { isUniqueViolation } from "@/server/db-errors";
import { BadRequestError, ConflictError, NotFoundError } from "@/server/http/errors";

export type ExerciseFilter = "active" | "archived" | "all";

const columns = {
  id: exercise.id,
  name: exercise.name,
  equipment: exercise.equipment,
  repMin: exercise.repMin,
  repMax: exercise.repMax,
  incrementKg: exercise.incrementKg,
  archived: exercise.archived,
};

// La colonne est un texte borné par une contrainte check : seules les valeurs de EQUIPMENT y entrent.
function toExercise(row: Omit<Exercise, "equipment"> & { equipment: string }): Exercise {
  return { ...row, equipment: row.equipment as Equipment };
}

function byName(a: Exercise, b: Exercise) {
  return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
}

export async function listExercises(
  db: AppDatabase,
  userId: string,
  filter: ExerciseFilter,
): Promise<Exercise[]> {
  const conditions: SQL[] = [eq(exercise.userId, userId)];
  if (filter !== "all") conditions.push(eq(exercise.archived, filter === "archived"));
  const rows = await db
    .select(columns)
    .from(exercise)
    .where(and(...conditions));
  return rows.map(toExercise).sort(byName);
}

export async function createExercise(
  db: AppDatabase,
  userId: string,
  input: ExerciseInput,
): Promise<Exercise> {
  try {
    const [row] = await db
      .insert(exercise)
      .values({ ...input, userId })
      .returning(columns);
    return toExercise(row!);
  } catch (error) {
    if (isUniqueViolation(error)) throw new ConflictError("duplicate_name");
    throw error;
  }
}

export async function getExercise(db: AppDatabase, userId: string, id: string): Promise<Exercise> {
  const [row] = await db
    .select(columns)
    .from(exercise)
    .where(and(eq(exercise.id, id), eq(exercise.userId, userId)));
  if (!row) throw new NotFoundError();
  return toExercise(row);
}

export async function updateExercise(
  db: AppDatabase,
  userId: string,
  id: string,
  patch: ExercisePatch,
): Promise<Exercise> {
  const current = await getExercise(db, userId, id);
  const merged = { ...current, ...patch };
  if (merged.repMax < merged.repMin) throw new BadRequestError("invalid_rep_range");
  try {
    const [row] = await db
      .update(exercise)
      .set(patch)
      .where(and(eq(exercise.id, id), eq(exercise.userId, userId)))
      .returning(columns);
    if (!row) throw new NotFoundError();
    return toExercise(row);
  } catch (error) {
    if (isUniqueViolation(error)) throw new ConflictError("duplicate_name");
    throw error;
  }
}
