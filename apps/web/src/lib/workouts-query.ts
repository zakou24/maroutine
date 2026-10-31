import type { WorkoutSummary } from "@maroutine/core";
import { apiFetch } from "./api";

// Séances d'une période ; la clé commence par « workouts » pour être invalidée après chaque écriture.
export function workoutsQuery(from: string, to: string) {
  return {
    queryKey: ["workouts", from, to],
    queryFn: () => apiFetch<WorkoutSummary[]>(`/api/v1/workouts?from=${from}&to=${to}`),
  };
}
