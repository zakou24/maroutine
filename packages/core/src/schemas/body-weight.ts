import { z } from "zod";

// Une pesée par jour, en kg avec une décimale au plus (F-POI-1). Les bornes arrêtent une faute
// de frappe (« 784 » au lieu de « 78,4 »).
export const MIN_WEIGHT_KG = 20;
export const MAX_WEIGHT_KG = 300;

export function isTenthKg(value: number): boolean {
  return Math.abs(value * 10 - Math.round(value * 10)) < 1e-9;
}

export const weighInInputSchema = z.object({
  weightKg: z
    .number()
    .min(MIN_WEIGHT_KG)
    .max(MAX_WEIGHT_KG)
    .refine(isTenthKg, { message: "Une décimale au plus." }),
});

export type WeighInInput = z.infer<typeof weighInInputSchema>;

export type BodyWeight = { date: string; weightKg: number };
