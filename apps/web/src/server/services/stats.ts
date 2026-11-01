import {
  exerciseTrend,
  periodStart,
  sessionStats,
  suggestNext,
  suggestionText,
  todayIn,
  trendCorridor,
  type Exercise,
  type ExerciseSession,
  type ExerciseStatsResponse,
  type ExerciseTrendSummary,
  type Period,
  type SuggestionResponse,
  type WeighIn,
} from "@maroutine/core";
import { and, asc, eq, lt, type SQL } from "drizzle-orm";
import type { AppDatabase } from "@/db/client";
import { workout, workoutExercise, workoutSet } from "@/db/schema";
import { weighInsOf } from "./body-weights";
import { getExercise, listExercises } from "./exercises";

// Les pesées ne servent qu'aux exercices au poids du corps (C5) : on ne les lit que pour eux.
async function weighInsFor(
  db: AppDatabase,
  userId: string,
  exercises: Exercise[],
): Promise<WeighIn[]> {
  return exercises.some((e) => e.equipment === "bodyweight") ? weighInsOf(db, userId) : [];
}

export function parisToday(): string {
  return todayIn("Europe/Paris", new Date());
}

// Historique des exercices de l'utilisateur, en une requête : séances chronologiques par exercice.
async function histories(
  db: AppDatabase,
  userId: string,
  options: { exerciseId?: string; before?: string } = {},
): Promise<Map<string, ExerciseSession[]>> {
  const conditions: SQL[] = [eq(workout.userId, userId)];
  if (options.exerciseId) conditions.push(eq(workoutExercise.exerciseId, options.exerciseId));
  if (options.before) conditions.push(lt(workout.performedOn, options.before));
  const rows = await db
    .select({
      exerciseId: workoutExercise.exerciseId,
      linkId: workoutExercise.id,
      workoutId: workout.id,
      performedOn: workout.performedOn,
      weightKg: workoutSet.weightKg,
      reps: workoutSet.reps,
      isWarmup: workoutSet.isWarmup,
    })
    .from(workoutSet)
    .innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
    .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .where(and(...conditions))
    // Plusieurs séances le même jour (F-SEA-6) : l'ordre de création les départage.
    .orderBy(
      asc(workout.performedOn),
      asc(workout.createdAt),
      asc(workout.id),
      asc(workoutSet.position),
    );

  const byExercise = new Map<string, ExerciseSession[]>();
  const byLink = new Map<string, ExerciseSession>();
  for (const row of rows) {
    let session = byLink.get(row.linkId);
    if (!session) {
      session = { workoutId: row.workoutId, performedOn: row.performedOn, sets: [] };
      byLink.set(row.linkId, session);
      byExercise.set(row.exerciseId, [...(byExercise.get(row.exerciseId) ?? []), session]);
    }
    session.sets.push({ weightKg: row.weightKg, reps: row.reps, isWarmup: row.isWarmup });
  }
  return byExercise;
}

// Seules les séances avec au moins une série de travail apparaissent dans les stats.
function statsOf(exercise: Exercise, sessions: ExerciseSession[], weighIns: WeighIn[]) {
  return sessions
    .map((s) => sessionStats(s, exercise.equipment, weighIns))
    .filter((s) => s.workingSetCount > 0);
}

export async function exerciseStats(
  db: AppDatabase,
  userId: string,
  exerciseId: string,
  period: Period,
  today: string,
): Promise<ExerciseStatsResponse> {
  const exercise = await getExercise(db, userId, exerciseId);
  const sessions = (await histories(db, userId, { exerciseId })).get(exerciseId) ?? [];
  const stats = statsOf(exercise, sessions, await weighInsFor(db, userId, [exercise]));
  const start = periodStart(today, period);
  const inPeriod = (date: string) => start === null || date >= start;
  return {
    trend: exerciseTrend(stats, today),
    latest: stats.at(-1) ?? null,
    sessions: stats.filter((s) => inPeriod(s.performedOn)),
    // Calculé sur tout l'historique, pour que le début de la période ait déjà son couloir.
    corridor: trendCorridor(stats).filter((p) => inPeriod(p.performedOn)),
  };
}

export async function exerciseSuggestion(
  db: AppDatabase,
  userId: string,
  exerciseId: string,
  before: string | undefined,
): Promise<SuggestionResponse> {
  const exercise = await getExercise(db, userId, exerciseId);
  const sessions = (await histories(db, userId, { exerciseId, before })).get(exerciseId) ?? [];
  const weighIns = await weighInsFor(db, userId, [exercise]);
  const stats = sessions.map((s) => sessionStats(s, exercise.equipment, weighIns));
  const suggestion = suggestNext(sessions, stats, exercise);
  return { suggestion, text: suggestionText(suggestion, exercise.equipment) };
}

export async function exerciseTrends(
  db: AppDatabase,
  userId: string,
  today: string,
): Promise<ExerciseTrendSummary[]> {
  const [exercises, all] = await Promise.all([
    listExercises(db, userId, "active"),
    histories(db, userId),
  ]);
  const weighIns = await weighInsFor(db, userId, exercises);
  return exercises.map((exercise) => {
    const stats = statsOf(exercise, all.get(exercise.id) ?? [], weighIns);
    const withMax = stats.filter((s) => s.estimatedMax !== null).at(-1);
    return {
      exerciseId: exercise.id,
      trend: exerciseTrend(stats, today),
      latestMax: withMax?.estimatedMax ?? null,
      approximate: withMax?.approximate ?? false,
    };
  });
}
