import {
  MEALS,
  dayTotals,
  entryNutrients,
  scaleEntry,
  targetOn,
  type CopyEntriesInput,
  type DayJournal,
  type FoodEntry,
  type FoodEntryInput,
  type FoodEntryPatch,
  type Meal,
} from "@maroutine/core";
import { and, asc, eq, type SQL } from "drizzle-orm";
import type { AppDatabase } from "@/db/client";
import { foodEntry } from "@/db/schema";
import { BadRequestError, NotFoundError } from "@/server/http/errors";
import { usableFood } from "./foods";
import { listTargets } from "./nutrition-targets";

const columns = {
  id: foodEntry.id,
  eatenOn: foodEntry.eatenOn,
  meal: foodEntry.meal,
  foodId: foodEntry.foodId,
  label: foodEntry.label,
  quantityG: foodEntry.quantityG,
  kcal: foodEntry.kcal,
  proteinG: foodEntry.proteinG,
};

// La colonne est bornée par une contrainte check : seules les valeurs de MEALS y entrent.
function toEntry(row: Omit<FoodEntry, "meal"> & { meal: string }): FoodEntry {
  return { ...row, meal: row.meal as Meal };
}

async function entriesOn(db: AppDatabase, userId: string, date: string, meal?: Meal) {
  const conditions: SQL[] = [eq(foodEntry.userId, userId), eq(foodEntry.eatenOn, date)];
  if (meal) conditions.push(eq(foodEntry.meal, meal));
  const rows = await db
    .select(columns)
    .from(foodEntry)
    .where(and(...conditions))
    .orderBy(asc(foodEntry.createdAt), asc(foodEntry.id));
  return rows.map(toEntry).sort((a, b) => MEALS.indexOf(a.meal) - MEALS.indexOf(b.meal));
}

export async function dayJournal(
  db: AppDatabase,
  userId: string,
  date: string,
): Promise<DayJournal> {
  const [entries, targets] = await Promise.all([
    entriesOn(db, userId, date),
    listTargets(db, userId),
  ]);
  return { date, entries, totals: dayTotals(entries), target: targetOn(targets, date) };
}

export async function createEntry(
  db: AppDatabase,
  userId: string,
  input: FoodEntryInput,
): Promise<FoodEntry> {
  const values =
    "foodId" in input
      ? await (async () => {
          const source = await usableFood(db, userId, input.foodId);
          return {
            foodId: source.id,
            label: source.name,
            quantityG: input.quantityG,
            ...entryNutrients(source, input.quantityG),
          };
        })()
      : {
          foodId: null,
          label: input.label,
          quantityG: null,
          kcal: input.kcal,
          proteinG: input.proteinG,
        };
  const [row] = await db
    .insert(foodEntry)
    .values({ userId, eatenOn: input.eatenOn, meal: input.meal, ...values })
    .returning(columns);
  return toEntry(row!);
}

export async function updateEntry(
  db: AppDatabase,
  userId: string,
  id: string,
  patch: FoodEntryPatch,
): Promise<FoodEntry> {
  const [current] = await db
    .select(columns)
    .from(foodEntry)
    .where(and(eq(foodEntry.id, id), eq(foodEntry.userId, userId)));
  if (!current) throw new NotFoundError();
  const set: Partial<typeof foodEntry.$inferInsert> = {};
  if (patch.meal) set.meal = patch.meal;
  if (patch.quantityG !== undefined) {
    // Seule une entrée faite avec une quantité se recalcule, en proportion de ses valeurs figées.
    if (current.quantityG === null) throw new BadRequestError("not_a_food_entry");
    Object.assign(
      set,
      { quantityG: patch.quantityG },
      scaleEntry({ ...current, quantityG: current.quantityG }, patch.quantityG),
    );
  }
  if (patch.label !== undefined || patch.kcal !== undefined || patch.proteinG !== undefined) {
    if (current.quantityG !== null) throw new BadRequestError("not_a_quick_entry");
    if (patch.label !== undefined) set.label = patch.label;
    if (patch.kcal !== undefined) set.kcal = patch.kcal;
    if (patch.proteinG !== undefined) set.proteinG = patch.proteinG;
  }
  const [row] = await db
    .update(foodEntry)
    .set(set)
    .where(and(eq(foodEntry.id, id), eq(foodEntry.userId, userId)))
    .returning(columns);
  return toEntry(row!);
}

export async function deleteEntry(db: AppDatabase, userId: string, id: string) {
  const rows = await db
    .delete(foodEntry)
    .where(and(eq(foodEntry.id, id), eq(foodEntry.userId, userId)))
    .returning({ id: foodEntry.id });
  if (rows.length === 0) throw new NotFoundError();
}

// Duplication (F-ALI-7) : les entrées s'ajoutent à celles du jour visé, dans les mêmes repas.
export async function copyEntries(
  db: AppDatabase,
  userId: string,
  input: CopyEntriesInput,
): Promise<{ created: number }> {
  const source = await entriesOn(db, userId, input.fromDate, input.meal);
  if (source.length === 0) return { created: 0 };
  await db.insert(foodEntry).values(
    source.map((entry) => ({
      userId,
      eatenOn: input.toDate,
      meal: entry.meal,
      foodId: entry.foodId,
      label: entry.label,
      quantityG: entry.quantityG,
      kcal: entry.kcal,
      proteinG: entry.proteinG,
    })),
  );
  return { created: source.length };
}
