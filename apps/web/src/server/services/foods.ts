import {
  orderSearchResults,
  parseOffHit,
  type Food,
  type FoodInput,
  type FoodSearchResponse,
  type OffProduct,
} from "@maroutine/core";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { AppDatabase } from "@/db/client";
import { food, foodEntry } from "@/db/schema";
import { NotFoundError } from "@/server/http/errors";
import type { OffSearch } from "@/server/off-client";

const columns = {
  id: food.id,
  name: food.name,
  brand: food.brand,
  kcalPer100g: food.kcalPer100g,
  proteinPer100g: food.proteinPer100g,
  source: food.source,
};

// La colonne est bornée par une contrainte check : seules « custom » et « off » y entrent.
function toFood(row: Omit<Food, "source"> & { source: string }): Food {
  return { ...row, source: row.source as Food["source"] };
}

// Assez de résultats locaux : pas d'appel externe (§5).
const LOCAL_ENOUGH = 10;
const LIMIT = 20;
// Sous la limite publiée de 10 par minute, pour garder de la marge (T-09).
const OFF_CALLS_PER_MINUTE = 6;
const offCalls = new Map<string, number[]>();

export function resetOffRateLimit() {
  offCalls.clear();
}

function takeOffSlot(userId: string, now = Date.now()): boolean {
  const recent = (offCalls.get(userId) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= OFF_CALLS_PER_MINUTE) {
    offCalls.set(userId, recent);
    return false;
  }
  offCalls.set(userId, [...recent, now]);
  return true;
}

function likePattern(q: string) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

async function withTimeout(off: OffSearch, q: string, timeoutMs: number): Promise<unknown[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await Promise.race([
      off(q, controller.signal),
      new Promise<never>((_, reject) =>
        controller.signal.addEventListener("abort", () => reject(new Error("off_timeout"))),
      ),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

// Met en cache les produits Open Food Facts : une ligne par code, mise à jour si elle existe.
async function cacheProducts(db: AppDatabase, products: OffProduct[]): Promise<Food[]> {
  const unique = [...new Map(products.map((p) => [p.offCode, p])).values()];
  if (unique.length === 0) return [];
  const rows = await db
    .insert(food)
    .values(unique.map((p) => ({ source: "off", ...p, fetchedAt: new Date() })))
    .onConflictDoUpdate({
      target: food.offCode,
      targetWhere: sql`${food.source} = 'off'`,
      set: {
        name: sql`excluded.name`,
        brand: sql`excluded.brand`,
        kcalPer100g: sql`excluded.kcal_per_100g`,
        proteinPer100g: sql`excluded.protein_per_100g`,
        fetchedAt: sql`excluded.fetched_at`,
      },
    })
    .returning(columns);
  return rows.map(toFood);
}

// Les 20 derniers aliments utilisés par l'utilisateur (F-ALI-6).
export async function recentFoods(db: AppDatabase, userId: string): Promise<Food[]> {
  const rows = await db
    .select(columns)
    .from(foodEntry)
    .innerJoin(food, eq(food.id, foodEntry.foodId))
    .where(eq(foodEntry.userId, userId))
    .groupBy(food.id)
    .orderBy(desc(sql`max(${foodEntry.createdAt})`))
    .limit(LIMIT);
  return rows.map(toFood);
}

export async function searchFoods(
  db: AppDatabase,
  userId: string,
  q: string,
  off: OffSearch,
  timeoutMs: number,
): Promise<FoodSearchResponse> {
  const pattern = likePattern(q);
  const [custom, recent, cached] = await Promise.all([
    db
      .select(columns)
      .from(food)
      .where(and(eq(food.ownerId, userId), ilike(food.name, pattern)))
      .orderBy(asc(food.name))
      .limit(LIMIT),
    recentFoods(db, userId),
    db
      .select(columns)
      .from(food)
      .where(and(eq(food.source, "off"), or(ilike(food.name, pattern), ilike(food.brand, pattern))))
      .orderBy(asc(food.name))
      .limit(LIMIT),
  ]);
  const needle = q.toLocaleLowerCase("fr");
  const matching = recent.filter((f) =>
    `${f.name} ${f.brand ?? ""}`.toLocaleLowerCase("fr").includes(needle),
  );
  let offFoods = cached.map(toFood);
  let offUnavailable = false;
  const local = new Set([...custom, ...matching, ...cached].map((f) => f.id)).size;
  if (local < LOCAL_ENOUGH && takeOffSlot(userId)) {
    try {
      const hits = await withTimeout(off, q, timeoutMs);
      const fresh = await cacheProducts(
        db,
        hits.map(parseOffHit).filter((p) => p !== null),
      );
      offFoods = [...offFoods, ...fresh];
    } catch {
      offUnavailable = true;
    }
  }
  return {
    results: orderSearchResults(custom.map(toFood), matching, offFoods).slice(0, 40),
    offUnavailable,
  };
}

// Aliments perso de l'utilisateur, par nom (écran « Mes aliments »).
export async function listCustomFoods(db: AppDatabase, userId: string): Promise<Food[]> {
  const rows = await db
    .select(columns)
    .from(food)
    .where(eq(food.ownerId, userId))
    .orderBy(asc(food.name));
  return rows.map(toFood);
}

export async function createFood(db: AppDatabase, userId: string, input: FoodInput): Promise<Food> {
  const [row] = await db
    .insert(food)
    .values({ ...input, ownerId: userId, source: "custom" })
    .returning(columns);
  return toFood(row!);
}

export async function updateFood(
  db: AppDatabase,
  userId: string,
  id: string,
  patch: Partial<FoodInput>,
): Promise<Food> {
  const [row] = await db
    .update(food)
    .set(patch)
    .where(and(eq(food.id, id), eq(food.ownerId, userId)))
    .returning(columns);
  if (!row) throw new NotFoundError();
  return toFood(row);
}

// Les entrées passées gardent libellé et valeurs : leur lien vers l'aliment passe à null.
export async function deleteFood(db: AppDatabase, userId: string, id: string) {
  const rows = await db
    .delete(food)
    .where(and(eq(food.id, id), eq(food.ownerId, userId)))
    .returning({ id: food.id });
  if (rows.length === 0) throw new NotFoundError();
}

// Un aliment utilisable par l'utilisateur : le sien, ou un produit Open Food Facts en cache.
export async function usableFood(db: AppDatabase, userId: string, id: string): Promise<Food> {
  const [row] = await db
    .select(columns)
    .from(food)
    .where(and(eq(food.id, id), or(eq(food.ownerId, userId), eq(food.source, "off"))));
  if (!row) throw new NotFoundError();
  return toFood(row);
}
