import type {
  CrossingResponse,
  ExerciseStatsResponse,
  ExerciseTrendSummary,
  NextSuggestions,
  NutritionDay,
  Period,
  SuggestionResponse,
} from "@maroutine/core";
import type { QueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";

export function statsQuery(exerciseId: string, period: Period) {
  return {
    queryKey: ["exercise-stats", exerciseId, period],
    queryFn: () =>
      apiFetch<ExerciseStatsResponse>(`/api/v1/exercises/${exerciseId}/stats?period=${period}`),
  };
}

// Suggestion à partir de toutes les séances de l'exercice, ou de celles avant `before`.
export function suggestionQuery(exerciseId: string, before?: string) {
  return {
    queryKey: ["suggestion", exerciseId, before ?? null],
    queryFn: () =>
      apiFetch<SuggestionResponse>(
        `/api/v1/exercises/${exerciseId}/suggestion${before ? `?before=${before}` : ""}`,
      ),
  };
}

export const trendsQuery = {
  queryKey: ["exercise-trends"],
  queryFn: () => apiFetch<ExerciseTrendSummary[]>("/api/v1/exercises/trends"),
};

// Totaux, objectif et statut de chaque jour (§6.7).
export function nutritionDaysQuery(from: string, to: string) {
  return {
    queryKey: ["nutrition-days", from, to],
    queryFn: () => apiFetch<NutritionDay[]>(`/api/v1/nutrition/days?from=${from}&to=${to}`),
  };
}

export const crossingQuery = {
  queryKey: ["crossing"],
  queryFn: () => apiFetch<CrossingResponse>("/api/v1/stats/crossing"),
};

export const nextQuery = {
  queryKey: ["next-suggestions"],
  queryFn: () => apiFetch<NextSuggestions>("/api/v1/stats/next"),
};

// Après l'écriture d'une séance, les stats sont recalculées par le serveur : on relit tout.
export async function invalidateStats(queryClient: QueryClient) {
  await Promise.all(
    ["exercise-stats", "exercise-trends", "suggestion", "crossing", "next-suggestions"].map((key) =>
      queryClient.invalidateQueries({ queryKey: [key] }),
    ),
  );
}
