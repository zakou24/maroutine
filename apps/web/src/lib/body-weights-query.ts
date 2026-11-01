import type { BodyWeight } from "@maroutine/core";
import { apiFetch } from "./api";

// Tout l'historique en une fois : une pesée par jour pèse peu, et la courbe a une période « Tout ».
export const bodyWeightsQuery = {
  queryKey: ["body-weights"],
  queryFn: () => apiFetch<BodyWeight[]>("/api/v1/body-weights"),
};
