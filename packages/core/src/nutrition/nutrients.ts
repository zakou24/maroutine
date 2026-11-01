// Valeurs des entrées, totaux du jour et objectif en vigueur (C6, C8, architecture.md §6.7).

import type { Food, FoodResult, Nutrients, NutritionTarget } from "../schemas/food";

const round1 = (n: number) => Math.round(n * 10) / 10;

// Valeurs figées d'une entrée à l'enregistrement : rien ne les recalcule depuis l'aliment ensuite.
export function entryNutrients(
  food: Pick<Food, "kcalPer100g" | "proteinPer100g">,
  quantityG: number,
): Nutrients {
  return {
    kcal: round1((food.kcalPer100g * quantityG) / 100),
    proteinG: round1((food.proteinPer100g * quantityG) / 100),
  };
}

// Nouvelle quantité : en proportion des valeurs figées, sans relire l'aliment (corrigé depuis peut-être).
export function scaleEntry(entry: Nutrients & { quantityG: number }, quantityG: number): Nutrients {
  const ratio = quantityG / entry.quantityG;
  return { kcal: round1(entry.kcal * ratio), proteinG: round1(entry.proteinG * ratio) };
}

export function dayTotals(entries: Nutrients[]): Nutrients {
  return {
    kcal: round1(entries.reduce((sum, e) => sum + e.kcal, 0)),
    proteinG: round1(entries.reduce((sum, e) => sum + e.proteinG, 0)),
  };
}

// L'objectif en vigueur : le dernier dont la date d'effet est antérieure ou égale au jour.
export function targetOn(targets: NutritionTarget[], date: string): NutritionTarget | null {
  let current: NutritionTarget | null = null;
  for (const t of targets) {
    if (t.validFrom <= date && (!current || t.validFrom > current.validFrom)) current = t;
  }
  return current;
}

// Ordre des résultats (F-ALI-2) : perso, puis récents, puis Open Food Facts, chacun une seule fois.
export function orderSearchResults(custom: Food[], recent: Food[], off: Food[]): FoodResult[] {
  const recentIds = new Set(recent.map((f) => f.id));
  const seen = new Set<string>();
  const results: FoodResult[] = [];
  for (const food of [...custom, ...recent, ...off]) {
    if (seen.has(food.id)) continue;
    seen.add(food.id);
    results.push({ ...food, recent: recentIds.has(food.id) });
  }
  return results;
}

// Apport moyen par jour renseigné (F-TDB-2), arrondi à l'unité ; null sans jour renseigné.
export function averageIntake(
  days: { kcal: number; proteinG: number; entryCount: number }[],
): { kcal: number; proteinG: number; days: number } | null {
  const recorded = days.filter((d) => d.entryCount > 0);
  if (recorded.length === 0) return null;
  const mean = (key: "kcal" | "proteinG") =>
    Math.round(recorded.reduce((sum, d) => sum + d[key], 0) / recorded.length);
  return { kcal: mean("kcal"), proteinG: mean("proteinG"), days: recorded.length };
}
