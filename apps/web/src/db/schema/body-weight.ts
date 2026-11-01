import { sql } from "drizzle-orm";
import { check, date, numeric, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { user } from "./auth";

// Une pesée par jour et par utilisateur (F-POI-1) : la clé primaire porte la règle.
export const bodyWeight = pgTable(
  "body_weight",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    measuredOn: date("measured_on", { mode: "string" }).notNull(),
    weightKg: numeric("weight_kg", { precision: 4, scale: 1, mode: "number" }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.measuredOn] }),
    check("body_weight_kg", sql`${t.weightKg} between 20 and 300`),
  ],
);
