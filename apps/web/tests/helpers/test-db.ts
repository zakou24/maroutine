import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import type { SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { AppDatabase } from "@/db/client";
import * as schema from "@/db/schema";

const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

// Une base PostgreSQL en mémoire par appel, avec les migrations du dépôt appliquées.
export async function createTestDb(): Promise<AppDatabase> {
  const db = drizzle({ client: new PGlite(), schema });
  if (existsSync(`${migrationsFolder}/meta/_journal.json`)) {
    await migrate(db, { migrationsFolder });
  }
  return db;
}

// Neon et PGlite renvoient tous deux { rows } ; le type commun ne le sait pas.
export async function rowsOf<T>(db: AppDatabase, query: SQL): Promise<T[]> {
  const result = (await db.execute(query)) as { rows: T[] };
  return result.rows;
}
