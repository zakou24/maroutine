import type { NutritionTarget, NutritionTargetInput } from "@maroutine/core";
import { desc, eq } from "drizzle-orm";
import type { AppDatabase } from "@/db/client";
import { nutritionTarget } from "@/db/schema";

const columns = {
  validFrom: nutritionTarget.validFrom,
  kcal: nutritionTarget.kcal,
  proteinG: nutritionTarget.proteinG,
};

export async function listTargets(db: AppDatabase, userId: string): Promise<NutritionTarget[]> {
  return db
    .select(columns)
    .from(nutritionTarget)
    .where(eq(nutritionTarget.userId, userId))
    .orderBy(desc(nutritionTarget.validFrom));
}

// Une nouvelle saisie à la même date d'effet remplace la précédente.
export async function putTarget(
  db: AppDatabase,
  userId: string,
  input: NutritionTargetInput,
): Promise<NutritionTarget> {
  const [row] = await db
    .insert(nutritionTarget)
    .values({ userId, ...input })
    .onConflictDoUpdate({
      target: [nutritionTarget.userId, nutritionTarget.validFrom],
      set: { kcal: input.kcal, proteinG: input.proteinG },
    })
    .returning(columns);
  return row!;
}
