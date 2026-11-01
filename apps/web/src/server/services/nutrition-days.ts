import { addDays, dayStatus, dayTotals, targetOn, type NutritionDay } from "@maroutine/core";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { AppDatabase } from "@/db/client";
import { foodEntry } from "@/db/schema";
import { listTargets } from "./nutrition-targets";

// Un élément par jour de `from` à `to`, jours sans entrée compris, avec l'objectif en vigueur ce
// jour-là et le statut du jour (§6.7).
export async function nutritionDays(
  db: AppDatabase,
  userId: string,
  from: string,
  to: string,
): Promise<NutritionDay[]> {
  const [rows, targets] = await Promise.all([
    db
      .select({
        date: foodEntry.eatenOn,
        kcal: sql<number>`sum(${foodEntry.kcal})::float8`,
        proteinG: sql<number>`sum(${foodEntry.proteinG})::float8`,
        entryCount: sql<number>`count(*)::int`,
      })
      .from(foodEntry)
      .where(
        and(eq(foodEntry.userId, userId), gte(foodEntry.eatenOn, from), lte(foodEntry.eatenOn, to)),
      )
      .groupBy(foodEntry.eatenOn),
    listTargets(db, userId),
  ]);
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const result: NutritionDay[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const row = byDate.get(date);
    const totals = dayTotals(
      row ? [{ kcal: Number(row.kcal), proteinG: Number(row.proteinG) }] : [],
    );
    const entryCount = row ? Number(row.entryCount) : 0;
    const current = targetOn(targets, date);
    const target = current ? { kcal: current.kcal, proteinG: current.proteinG } : null;
    result.push({
      date,
      ...totals,
      entryCount,
      target,
      status: dayStatus({ ...totals, entryCount }, target),
    });
  }
  return result;
}
