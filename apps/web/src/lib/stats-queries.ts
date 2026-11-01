import type {
  ExerciseStatsResponse,
  ExerciseTrendSummary,
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

// Après l'écriture d'une séance, les stats sont recalculées par le serveur : on relit tout.
export async function invalidateStats(queryClient: QueryClient) {
  await Promise.all(
    ["exercise-stats", "exercise-trends", "suggestion"].map((key) =>
      queryClient.invalidateQueries({ queryKey: [key] }),
    ),
  );
}
