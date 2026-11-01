import type { BodyWeight, WeighIn } from "@maroutine/core";
import { and, asc, eq, gte, lte, type SQL } from "drizzle-orm";
import type { AppDatabase } from "@/db/client";
import { bodyWeight } from "@/db/schema";
import { BadRequestError } from "@/server/http/errors";

const columns = { date: bodyWeight.measuredOn, weightKg: bodyWeight.weightKg };

export async function listBodyWeights(
  db: AppDatabase,
  userId: string,
  range: { from?: string; to?: string } = {},
): Promise<BodyWeight[]> {
  const conditions: SQL[] = [eq(bodyWeight.userId, userId)];
  if (range.from) conditions.push(gte(bodyWeight.measuredOn, range.from));
  if (range.to) conditions.push(lte(bodyWeight.measuredOn, range.to));
  return db
    .select(columns)
    .from(bodyWeight)
    .where(and(...conditions))
    .orderBy(asc(bodyWeight.measuredOn));
}

// Une nouvelle saisie le même jour remplace la précédente (F-POI-1).
export async function putBodyWeight(
  db: AppDatabase,
  userId: string,
  date: string,
  weightKg: number,
  today: string,
): Promise<BodyWeight> {
  if (date > today) throw new BadRequestError("future_date");
  const [row] = await db
    .insert(bodyWeight)
    .values({ userId, measuredOn: date, weightKg })
    .onConflictDoUpdate({ target: [bodyWeight.userId, bodyWeight.measuredOn], set: { weightKg } })
    .returning(columns);
  return row!;
}

export async function deleteBodyWeight(db: AppDatabase, userId: string, date: string) {
  await db
    .delete(bodyWeight)
    .where(and(eq(bodyWeight.userId, userId), eq(bodyWeight.measuredOn, date)));
}

// Pesées au format des stats (charge effective du poids du corps, C5).
export async function weighInsOf(db: AppDatabase, userId: string): Promise<WeighIn[]> {
  return (await listBodyWeights(db, userId)).map((w) => ({ date: w.date, kg: w.weightKg }));
}
