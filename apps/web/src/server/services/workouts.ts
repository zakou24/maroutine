import type {
  LastSets,
  NewWorkoutInput,
  SetInput,
  Workout,
  WorkoutInput,
  WorkoutSummary,
} from "@maroutine/core";
import { and, asc, desc, eq, gte, inArray, lt, lte, ne, sql, type SQL } from "drizzle-orm";
import type { AppDatabase } from "@/db/client";
import { exercise, workout, workoutExercise, workoutSet } from "@/db/schema";
import { NotFoundError } from "@/server/http/errors";
import { getExercise } from "./exercises";

// Chaque exerciseId du corps doit appartenir à l'utilisateur, sinon 404 avant toute écriture (T-01).
async function assertOwnExercises(db: AppDatabase, userId: string, input: WorkoutInput) {
  const ids = input.exercises.map((e) => e.exerciseId);
  const rows = await db
    .select({ id: exercise.id })
    .from(exercise)
    .where(and(eq(exercise.userId, userId), inArray(exercise.id, ids)));
  if (rows.length !== ids.length) throw new NotFoundError();
}

async function insertContent(db: AppDatabase, workoutId: string, input: WorkoutInput) {
  const links = await db
    .insert(workoutExercise)
    .values(
      input.exercises.map((e, position) => ({ workoutId, exerciseId: e.exerciseId, position })),
    )
    .returning({ id: workoutExercise.id, exerciseId: workoutExercise.exerciseId });
  const linkOf = new Map(links.map((l) => [l.exerciseId, l.id]));
  await db.insert(workoutSet).values(
    input.exercises.flatMap((e) =>
      e.sets.map((set, position) => ({
        ...set,
        position,
        workoutExerciseId: linkOf.get(e.exerciseId)!,
      })),
    ),
  );
}

function headOf(input: WorkoutInput) {
  return {
    performedOn: input.performedOn,
    note: input.note ? input.note : null,
    warmupDone: input.warmupDone,
    cardioMinutes: input.cardioMinutes ?? null,
  };
}

export async function getWorkout(db: AppDatabase, userId: string, id: string): Promise<Workout> {
  const [head] = await db
    .select({
      id: workout.id,
      performedOn: workout.performedOn,
      note: workout.note,
      warmupDone: workout.warmupDone,
      cardioMinutes: workout.cardioMinutes,
    })
    .from(workout)
    .where(and(eq(workout.id, id), eq(workout.userId, userId)));
  if (!head) throw new NotFoundError();

  const rows = await db
    .select({
      linkId: workoutExercise.id,
      exerciseId: workoutExercise.exerciseId,
      name: exercise.name,
      archived: exercise.archived,
      weightKg: workoutSet.weightKg,
      reps: workoutSet.reps,
      isWarmup: workoutSet.isWarmup,
    })
    .from(workoutExercise)
    .innerJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
    .innerJoin(workoutSet, eq(workoutSet.workoutExerciseId, workoutExercise.id))
    .where(eq(workoutExercise.workoutId, id))
    .orderBy(asc(workoutExercise.position), asc(workoutSet.position));

  const exercises: Workout["exercises"] = [];
  let lastLink: string | undefined;
  for (const row of rows) {
    if (row.linkId !== lastLink) {
      exercises.push({
        exerciseId: row.exerciseId,
        name: row.name,
        archived: row.archived,
        sets: [],
      });
      lastLink = row.linkId;
    }
    exercises.at(-1)!.sets.push({ weightKg: row.weightKg, reps: row.reps, isWarmup: row.isWarmup });
  }
  return { ...head, exercises };
}

// Création idempotente : si la séance `input.id` existe déjà pour cet utilisateur, elle est
// renvoyée telle quelle (created: false) ; si elle appartient à un autre, 404.
export async function createWorkout(
  db: AppDatabase,
  userId: string,
  input: NewWorkoutInput,
): Promise<{ workout: Workout; created: boolean }> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(workout)
      .values({ id: input.id, userId, ...headOf(input) })
      .onConflictDoNothing({ target: workout.id })
      .returning({ id: workout.id });
    if (!row) return { workout: await getWorkout(tx, userId, input.id!), created: false };
    await assertOwnExercises(tx, userId, input);
    await insertContent(tx, row.id, input);
    return { workout: await getWorkout(tx, userId, row.id), created: true };
  });
}

// La séance entière est remplacée en une transaction : une erreur ne laisse rien de modifié.
export async function replaceWorkout(
  db: AppDatabase,
  userId: string,
  id: string,
  input: WorkoutInput,
): Promise<Workout> {
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(workout)
      .set(headOf(input))
      .where(and(eq(workout.id, id), eq(workout.userId, userId)))
      .returning({ id: workout.id });
    if (updated.length === 0) throw new NotFoundError();
    await assertOwnExercises(tx, userId, input);
    await tx.delete(workoutExercise).where(eq(workoutExercise.workoutId, id));
    await insertContent(tx, id, input);
    return getWorkout(tx, userId, id);
  });
}

export async function deleteWorkout(db: AppDatabase, userId: string, id: string): Promise<void> {
  const deleted = await db
    .delete(workout)
    .where(and(eq(workout.id, id), eq(workout.userId, userId)))
    .returning({ id: workout.id });
  if (deleted.length === 0) throw new NotFoundError();
}

export async function listWorkouts(
  db: AppDatabase,
  userId: string,
  from: string,
  to: string,
): Promise<WorkoutSummary[]> {
  return db
    .select({
      id: workout.id,
      performedOn: workout.performedOn,
      warmupDone: workout.warmupDone,
      cardioMinutes: workout.cardioMinutes,
      exerciseCount: sql<number>`count(distinct ${workoutExercise.id})::int`,
      // Les échauffements n'entrent jamais dans les stats (C4).
      workingSetCount: sql<number>`(count(${workoutSet.id}) filter (where not ${workoutSet.isWarmup}))::int`,
    })
    .from(workout)
    .leftJoin(workoutExercise, eq(workoutExercise.workoutId, workout.id))
    .leftJoin(workoutSet, eq(workoutSet.workoutExerciseId, workoutExercise.id))
    .where(
      and(eq(workout.userId, userId), gte(workout.performedOn, from), lte(workout.performedOn, to)),
    )
    .groupBy(workout.id)
    .orderBy(asc(workout.performedOn), asc(workout.createdAt));
}

// Séries de la séance la plus récente qui contient l'exercice, strictement avant `before` si fourni.
export async function lastSets(
  db: AppDatabase,
  userId: string,
  exerciseId: string,
  before?: { performedOn: string; workoutId?: string },
): Promise<LastSets> {
  await getExercise(db, userId, exerciseId);
  const conditions: SQL[] = [
    eq(workout.userId, userId),
    eq(workoutExercise.exerciseId, exerciseId),
  ];
  if (before) conditions.push(lt(workout.performedOn, before.performedOn));
  if (before?.workoutId) conditions.push(ne(workout.id, before.workoutId));

  const [latest] = await db
    .select({ linkId: workoutExercise.id, performedOn: workout.performedOn })
    .from(workoutExercise)
    .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .where(and(...conditions))
    .orderBy(desc(workout.performedOn), desc(workout.createdAt))
    .limit(1);
  if (!latest) return { performedOn: null, sets: [] };

  const sets: SetInput[] = await db
    .select({ weightKg: workoutSet.weightKg, reps: workoutSet.reps, isWarmup: workoutSet.isWarmup })
    .from(workoutSet)
    // Les anciennes séries d'échauffement ne se reprennent pas : l'échauffement se note pour la séance (D14).
    .where(and(eq(workoutSet.workoutExerciseId, latest.linkId), eq(workoutSet.isWarmup, false)))
    .orderBy(asc(workoutSet.position));
  return { performedOn: latest.performedOn, sets };
}
