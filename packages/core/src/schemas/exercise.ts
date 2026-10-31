import { z } from "zod";
import { EQUIPMENT, defaultIncrementKg, type Equipment } from "../training/equipment";

// Multiple de 0,25 kg (C3) : 1,25 passe, 1,3 non.
export function isQuarterKg(value: number): boolean {
  return Math.round(value * 4) === value * 4;
}

const fields = {
  name: z.string().trim().min(1).max(60),
  equipment: z.enum(EQUIPMENT),
  repMin: z.int().min(1).max(50),
  repMax: z.int().min(1).max(50),
  incrementKg: z.number().gt(0).max(20).refine(isQuarterKg, "Multiple de 0,25 kg attendu."),
};

export const exerciseInputSchema = z
  .object({
    name: fields.name,
    equipment: fields.equipment,
    repMin: fields.repMin.default(6),
    repMax: fields.repMax.default(10),
    incrementKg: fields.incrementKg.optional(),
  })
  .refine((e) => e.repMax >= e.repMin, { path: ["repMax"], message: "repMax < repMin" })
  .transform((e) => ({ ...e, incrementKg: e.incrementKg ?? defaultIncrementKg(e.equipment) }));

export type ExerciseInput = z.output<typeof exerciseInputSchema>;

// Ajout de plusieurs exercices d'un coup, depuis le catalogue (D16).
export const exerciseBatchSchema = z.object({
  exercises: z.array(exerciseInputSchema).min(1).max(50),
});

// Champs facultatifs, sans défaut : la cohérence repMax ≥ repMin se vérifie sur la valeur fusionnée.
export const exercisePatchSchema = z.object({
  name: fields.name.optional(),
  equipment: fields.equipment.optional(),
  repMin: fields.repMin.optional(),
  repMax: fields.repMax.optional(),
  incrementKg: fields.incrementKg.optional(),
  archived: z.boolean().optional(),
});

export type ExercisePatch = z.output<typeof exercisePatchSchema>;

export type Exercise = {
  id: string;
  name: string;
  equipment: Equipment;
  repMin: number;
  repMax: number;
  incrementKg: number;
  archived: boolean;
};
