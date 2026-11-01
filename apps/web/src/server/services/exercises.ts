import type {
  Equipment,
  Exercise,
  ExerciseInput,
  ExercisePatch,
  MuscleGroup,
} from "@maroutine/core";
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
  muscleGroup: exercise.muscleGroup,
  repMin: exercise.repMin,
  repMax: exercise.repMax,
  incrementKg: exercise.incrementKg,
  archived: exercise.archived,
};

type ExerciseRow = Omit<Exercise, "equipment" | "muscleGroup"> & {
  equipment: string;
  muscleGroup: string | null;
};

// Les colonnes sont des textes bornés par des contraintes check : seules les valeurs de EQUIPMENT
// et de MUSCLE_GROUPS y entrent.
function toExercise(row: ExerciseRow): Exercise {
  return {
    ...row,
    equipment: row.equipment as Equipment,
    muscleGroup: row.muscleGroup as MuscleGroup | null,
  };
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

// Ajout depuis le catalogue (D16) : crée en une transaction les exercices dont le nom n'existe pas
// encore pour cet utilisateur (sans tenir compte de la casse), et renvoie les autres tels quels.
export async function createExercises(
  db: AppDatabase,
  userId: string,
  inputs: ExerciseInput[],
): Promise<{ created: Exercise[]; existing: Exercise[] }> {
  return db.transaction(async (tx) => {
    const current = await listExercises(tx, userId, "all");
    const byName = new Map(current.map((e) => [e.name.toLowerCase(), e]));
    const created: Exercise[] = [];
    const existing: Exercise[] = [];
    for (const input of inputs) {
      const key = input.name.toLowerCase();
      let known = byName.get(key);
      if (known) {
        // Un exercice « Non classé » prend le groupe de l'entrée du catalogue (D27).
        if (known.muscleGroup === null) {
          known = await updateExercise(tx, userId, known.id, { muscleGroup: input.muscleGroup });
          byName.set(key, known);
        }
        if (!created.includes(known) && !existing.includes(known)) existing.push(known);
        continue;
      }
      const exercise = await createExercise(tx, userId, input);
      byName.set(key, exercise);
      created.push(exercise);
    }
    return { created, existing };
  });
}
