// Les quatre repas de la journée (C7).
export const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;

export type Meal = (typeof MEALS)[number];

const LABELS: Record<Meal, string> = {
  breakfast: "Petit-déjeuner",
  lunch: "Déjeuner",
  dinner: "Dîner",
  snack: "Collation",
};

export function mealLabel(meal: Meal): string {
  return LABELS[meal];
}
