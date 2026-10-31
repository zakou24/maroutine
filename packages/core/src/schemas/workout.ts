import { z } from "zod";
import { isQuarterKg } from "./exercise";

// Date calendaire réelle (C13) : « 2026-02-30 » est refusée.
export const isoDateSchema = z.iso.date();

export const setInputSchema = z.object({
  weightKg: z.number().min(0).max(999.75).refine(isQuarterKg, "Multiple de 0,25 kg attendu."),
  reps: z.int().min(0).max(100),
  // Une série d'échauffement est enregistrée mais n'entre jamais dans les stats (C4).
  isWarmup: z.boolean().default(false),
});

export type SetInput = z.output<typeof setInputSchema>;

export const workoutInputSchema = z.object({
  performedOn: isoDateSchema,
  note: z.string().trim().max(500).nullish(),
  exercises: z
    .array(z.object({ exerciseId: z.uuid(), sets: z.array(setInputSchema).min(1).max(20) }))
    .min(1)
    .max(20)
    .refine((list) => new Set(list.map((e) => e.exerciseId)).size === list.length, {
      message: "Un exercice ne figure qu'une fois par séance.",
    }),
});

export type WorkoutInput = z.output<typeof workoutInputSchema>;

// Création : l'identifiant peut être choisi par l'appareil, pour qu'un envoi rejoué
// (réponse perdue, app fermée) ne crée pas deux fois la même séance.
export const newWorkoutSchema = workoutInputSchema.extend({ id: z.uuid().optional() });

export type NewWorkoutInput = z.output<typeof newWorkoutSchema>;

export type Workout = {
  id: string;
  performedOn: string;
  note: string | null;
  exercises: { exerciseId: string; name: string; archived: boolean; sets: SetInput[] }[];
};

export type WorkoutSummary = {
  id: string;
  performedOn: string;
  exerciseCount: number;
  workingSetCount: number;
};

// Séries de la dernière séance qui contient un exercice, pour préremplir la saisie.
export type LastSets = { performedOn: string | null; sets: SetInput[] };
