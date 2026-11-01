import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

// Bornes en base, en plus de la validation zod : dernier filet si une route oublie de valider.
export const exercise = pgTable(
  "exercise",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    equipment: text("equipment").notNull(),
    // Nul pour un exercice créé avant D27 dont le nom n'est pas celui d'une entrée du catalogue.
    muscleGroup: text("muscle_group"),
    repMin: integer("rep_min").notNull(),
    repMax: integer("rep_max").notNull(),
    incrementKg: numeric("increment_kg", { precision: 5, scale: 2, mode: "number" }).notNull(),
    archived: boolean("archived").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("exercise_user_name_unique").on(t.userId, sql`lower(${t.name})`),
    check("exercise_name_length", sql`char_length(${t.name}) between 1 and 60`),
    check(
      "exercise_equipment",
      sql`${t.equipment} in ('barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other')`,
    ),
    check(
      "exercise_rep_range",
      sql`${t.repMin} >= 1 and ${t.repMax} >= ${t.repMin} and ${t.repMax} <= 50`,
    ),
    check("exercise_increment", sql`${t.incrementKg} > 0 and ${t.incrementKg} <= 20`),
    check(
      "exercise_muscle_group",
      sql`${t.muscleGroup} in ('chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'abs')`,
    ),
  ],
);

export const workout = pgTable(
  "workout",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    performedOn: date("performed_on", { mode: "string" }).notNull(),
    note: text("note"),
    // Échauffement noté pour la séance (D14) et cardio de fin de séance en minutes (D15).
    warmupDone: boolean("warmup_done").default(false).notNull(),
    cardioMinutes: integer("cardio_minutes"),
    // Muscles travaillés, choisis avant la séance (D28).
    muscleGroups: text("muscle_groups")
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("workout_user_performed_on_idx").on(t.userId, t.performedOn),
    check("workout_note_length", sql`char_length(${t.note}) <= 500`),
    check("workout_cardio_minutes", sql`${t.cardioMinutes} between 1 and 180`),
    check(
      "workout_muscle_groups",
      sql`${t.muscleGroups} <@ array['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'abs']::text[]`,
    ),
  ],
);

export const workoutExercise = pgTable(
  "workout_exercise",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workout.id, { onDelete: "cascade" }),
    // Un exercice ne se supprime jamais (il s'archive) : la base refuse de casser l'historique.
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercise.id, { onDelete: "no action" }),
    position: integer("position").notNull(),
  },
  (t) => [
    index("workout_exercise_exercise_idx").on(t.exerciseId),
    uniqueIndex("workout_exercise_workout_exercise_unique").on(t.workoutId, t.exerciseId),
  ],
);

export const workoutSet = pgTable(
  "workout_set",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workoutExerciseId: uuid("workout_exercise_id")
      .notNull()
      .references(() => workoutExercise.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2, mode: "number" }).notNull(),
    reps: integer("reps").notNull(),
    isWarmup: boolean("is_warmup").default(false).notNull(),
  },
  (t) => [
    index("workout_set_workout_exercise_idx").on(t.workoutExerciseId),
    check("workout_set_weight", sql`${t.weightKg} >= 0 and ${t.weightKg} <= 999.75`),
    check("workout_set_reps", sql`${t.reps} between 0 and 100`),
  ],
);
