import { weightSeries, type BodyWeight } from "@maroutine/core";
import { apiFetch } from "./api";

// Tout l'historique en une fois : une pesée par jour pèse peu, et la courbe a une période « Tout ».
export const bodyWeightsQuery = {
  queryKey: ["body-weights"],
  queryFn: () => apiFetch<BodyWeight[]>("/api/v1/body-weights"),
};

// Moyenne glissante du jour (J-6 à J) ; null sous 3 pesées en 7 jours (§6.6).
export function averageOn(weighIns: BodyWeight[], day: string): number | null {
  return weightSeries(weighIns, day, day)[0]?.average ?? null;
}
