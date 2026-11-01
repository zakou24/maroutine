import { z } from "zod";
import { MEALS, type Meal } from "../nutrition/meals";
import { isTenthKg } from "./body-weight";
import { isoDateSchema } from "./workout";

// Valeurs nutritionnelles saisies à une décimale au plus.
const tenth = (min: number, max: number) =>
  z.number().min(min).max(max).refine(isTenthKg, { message: "Une décimale au plus." });

const label = z.string().trim().min(1).max(80);
const mealSchema = z.enum(MEALS);

// Aliment perso (F-ALI-2) : valeurs pour 100 g, bornées comme les produits Open Food Facts (T-08).
export const foodInputSchema = z.object({
  name: label,
  kcalPer100g: tenth(0, 900),
  proteinPer100g: tenth(0, 100),
});

const entryBase = { eatenOn: isoDateSchema, meal: mealSchema };

// Une entrée vient d'un aliment (quantité en grammes) ou d'un ajout rapide (F-ALI-3).
export const foodEntryInputSchema = z.union([
  z.object({ ...entryBase, foodId: z.uuid(), quantityG: tenth(1, 5000) }),
  z.object({ ...entryBase, label, kcal: tenth(0, 5000), proteinG: tenth(0, 500) }),
]);

export const foodEntryPatchSchema = z
  .object({
    meal: mealSchema.optional(),
    quantityG: tenth(1, 5000).optional(),
    label: label.optional(),
    kcal: tenth(0, 5000).optional(),
    proteinG: tenth(0, 500).optional(),
  })
  .refine((patch) => Object.values(patch).some((v) => v !== undefined), {
    message: "Rien à modifier.",
  });

// Duplication d'une journée ou d'un repas vers un autre jour (F-ALI-7).
export const copyEntriesSchema = z
  .object({ fromDate: isoDateSchema, toDate: isoDateSchema, meal: mealSchema.optional() })
  .refine(({ fromDate, toDate }) => fromDate !== toDate, { message: "Choisis un autre jour." });

// Objectifs avec une date d'effet (C8).
export const nutritionTargetInputSchema = z.object({
  validFrom: isoDateSchema,
  kcal: z.int().min(500).max(10000),
  proteinG: z.int().min(0).max(500),
});

export type FoodInput = z.infer<typeof foodInputSchema>;
export type FoodEntryInput = z.infer<typeof foodEntryInputSchema>;
export type FoodEntryPatch = z.infer<typeof foodEntryPatchSchema>;
export type CopyEntriesInput = z.infer<typeof copyEntriesSchema>;
export type NutritionTargetInput = z.infer<typeof nutritionTargetInputSchema>;

export type Food = {
  id: string;
  name: string;
  brand: string | null;
  kcalPer100g: number;
  proteinPer100g: number;
  source: "custom" | "off";
};

export type FoodResult = Food & { recent: boolean };

export type FoodSearchResponse = { results: FoodResult[]; offUnavailable: boolean };

export type FoodEntry = {
  id: string;
  eatenOn: string;
  meal: Meal;
  foodId: string | null;
  label: string;
  quantityG: number | null;
  kcal: number;
  proteinG: number;
};

export type NutritionTarget = { validFrom: string; kcal: number; proteinG: number };

export type Nutrients = { kcal: number; proteinG: number };

export type DayJournal = {
  date: string;
  entries: FoodEntry[];
  totals: Nutrients;
  target: NutritionTarget | null;
};
