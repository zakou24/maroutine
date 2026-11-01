import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

// Aliments perso (owner_id renseigné) et produits Open Food Facts en cache (owner_id nul, ADR 0007).
export const food = pgTable(
  "food",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").references(() => user.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    offCode: text("off_code"),
    name: text("name").notNull(),
    brand: text("brand"),
    kcalPer100g: numeric("kcal_per_100g", { precision: 5, scale: 1, mode: "number" }).notNull(),
    proteinPer100g: numeric("protein_per_100g", {
      precision: 4,
      scale: 1,
      mode: "number",
    }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("food_off_code_unique")
      .on(t.offCode)
      .where(sql`${t.source} = 'off'`),
    index("food_owner_idx").on(t.ownerId),
    check(
      "food_source",
      sql`(${t.source} = 'custom' and ${t.ownerId} is not null) or (${t.source} = 'off' and ${t.ownerId} is null and ${t.offCode} is not null)`,
    ),
    check(
      "food_values",
      sql`${t.kcalPer100g} between 0 and 900 and ${t.proteinPer100g} between 0 and 100`,
    ),
  ],
);

// Une entrée du journal : valeurs figées à l'enregistrement, libellé gardé si l'aliment disparaît (C6).
export const foodEntry = pgTable(
  "food_entry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    eatenOn: date("eaten_on", { mode: "string" }).notNull(),
    meal: text("meal").notNull(),
    foodId: uuid("food_id").references(() => food.id, { onDelete: "set null" }),
    label: text("label").notNull(),
    quantityG: numeric("quantity_g", { precision: 5, scale: 1, mode: "number" }),
    kcal: numeric("kcal", { precision: 6, scale: 1, mode: "number" }).notNull(),
    proteinG: numeric("protein_g", { precision: 6, scale: 1, mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("food_entry_user_day_idx").on(t.userId, t.eatenOn),
    check("food_entry_meal", sql`${t.meal} in ('breakfast', 'lunch', 'dinner', 'snack')`),
    check("food_entry_quantity", sql`${t.quantityG} is null or ${t.quantityG} > 0`),
    check("food_entry_values", sql`${t.kcal} >= 0 and ${t.proteinG} >= 0`),
  ],
);

// Objectifs avec une date d'effet : l'historique est conservé (C8).
export const nutritionTarget = pgTable(
  "nutrition_target",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    validFrom: date("valid_from", { mode: "string" }).notNull(),
    kcal: integer("kcal").notNull(),
    proteinG: integer("protein_g").notNull(),
  },
  (t) => [
    uniqueIndex("nutrition_target_user_valid_from").on(t.userId, t.validFrom),
    check(
      "nutrition_target_values",
      sql`${t.kcal} between 500 and 10000 and ${t.proteinG} between 0 and 500`,
    ),
  ],
);
