import {
  addDays,
  crossing,
  exerciseTrend,
  progressions,
  windowDays,
  windowStatus,
  periodStart,
  sessionStats,
  suggestNext,
  suggestionText,
  todayIn,
  trendCorridor,
  type CrossingResponse,
  type DayStatus,
  type Exercise,
  type ExerciseSession,
  type ExerciseStatsResponse,
  type ExerciseTrendSummary,
  type NextSuggestions,
  type Period,
  type Progression,
  type SuggestionResponse,
  type WeighIn,
} from "@maroutine/core";
import { and, asc, desc, eq, lt, type SQL } from "drizzle-orm";
import type { AppDatabase } from "@/db/client";
import { exercise as exerciseTable, workout, workoutExercise, workoutSet } from "@/db/schema";
import { weighInsOf } from "./body-weights";
import { getExercise, listExercises } from "./exercises";
import { nutritionDays } from "./nutrition-days";

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
    lastMaxOn: stats.filter((s) => s.estimatedMax !== null).at(-1)?.performedOn ?? null,
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

// Croisement (F-TDB-3, §6.8) : progressions de tous les exercices, rapprochées de la fenêtre
// alimentaire de leur séance. Archivés compris dans « tous exercices » : leur historique compte.
export async function crossingStats(db: AppDatabase, userId: string): Promise<CrossingResponse> {
  const [exercises, all] = await Promise.all([
    listExercises(db, userId, "all"),
    histories(db, userId),
  ]);
  const weighIns = await weighInsFor(db, userId, exercises);
  const byExercise = new Map<string, Progression[]>();
  for (const exercise of exercises) {
    byExercise.set(
      exercise.id,
      progressions(exercise.id, statsOf(exercise, all.get(exercise.id) ?? [], weighIns)),
    );
  }
  const list = [...byExercise.values()].flat();
  const dates = list.map((p) => p.performedOn).sort();
  const statuses = new Map<string, DayStatus>();
  if (dates.length > 0) {
    const days = await nutritionDays(db, userId, addDays(dates[0]!, -3), dates.at(-1)!);
    for (const day of days) statuses.set(day.date, day.status);
  }
  const windowOf = (date: string) =>
    windowStatus(windowDays(date).map((d) => statuses.get(d) ?? "unrecorded"));
  return {
    all: crossing(list, windowOf),
    byExercise: exercises
      .filter((e) => !e.archived && (byExercise.get(e.id)?.length ?? 0) > 0)
      .map((e) => ({
        exerciseId: e.id,
        name: e.name,
        crossing: crossing(byExercise.get(e.id) ?? [], windowOf),
      })),
  };
}

// Prochaine séance (F-TDB-1) : la suggestion de chaque exercice de la dernière séance, dans son
// ordre, sur tout l'historique. Les exercices archivés depuis sont omis.
export async function nextSuggestions(db: AppDatabase, userId: string): Promise<NextSuggestions> {
  const [last] = await db
    .select({ id: workout.id, performedOn: workout.performedOn })
    .from(workout)
    .where(eq(workout.userId, userId))
    .orderBy(desc(workout.performedOn), desc(workout.createdAt), desc(workout.id))
    .limit(1);
  if (!last) return { workoutId: null, performedOn: null, items: [] };
  const exercises = await db
    .select({ id: exerciseTable.id, archived: exerciseTable.archived })
    .from(workoutExercise)
    .innerJoin(exerciseTable, eq(exerciseTable.id, workoutExercise.exerciseId))
    .where(eq(workoutExercise.workoutId, last.id))
    .orderBy(asc(workoutExercise.position));
  const items = [];
  for (const { id } of exercises.filter((e) => !e.archived)) {
    const exercise = await getExercise(db, userId, id);
    const { suggestion, text } = await exerciseSuggestion(db, userId, id, undefined);
    items.push({
      exerciseId: id,
      name: exercise.name,
      equipment: exercise.equipment,
      suggestion,
      text,
    });
  }
  return { workoutId: last.id, performedOn: last.performedOn, items };
}
