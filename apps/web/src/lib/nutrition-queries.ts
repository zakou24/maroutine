import type { DayJournal, Food, NutritionTarget } from "@maroutine/core";
import type { QueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";

export function journalQuery(date: string) {
  return {
    queryKey: ["journal", date],
    queryFn: () => apiFetch<DayJournal>(`/api/v1/food-entries?date=${date}`),
  };
}

export const recentFoodsQuery = {
  queryKey: ["foods-recent"],
  queryFn: () => apiFetch<Food[]>("/api/v1/foods/recent"),
};

export const targetsQuery = {
  queryKey: ["nutrition-targets"],
  queryFn: () => apiFetch<NutritionTarget[]>("/api/v1/nutrition-targets"),
};

// Après une écriture dans le journal ou les objectifs : journaux, aliments récents, statuts des
// jours et croisement changent.
export async function invalidateJournal(queryClient: QueryClient) {
  await Promise.all(
    ["journal", "foods-recent", "nutrition-days", "crossing"].map((key) =>
      queryClient.invalidateQueries({ queryKey: [key] }),
    ),
  );
}
