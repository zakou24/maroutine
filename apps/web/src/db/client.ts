import { PGlite } from "@electric-sql/pglite";
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { env } from "@/env";
import * as schema from "./schema";

// Type commun à Neon (production) et PGlite (développement, e2e, tests) : les services ne dépendent que de lui.
export type AppDatabase = PgDatabase<PgQueryResultHKT, typeof schema>;

const PGLITE_PREFIX = "pglite:";

// « pglite:./.data/dev » ouvre une base PGlite dans ce dossier (ADR 0010) ; toute autre URL passe par Neon.
export function createDb(url: string): AppDatabase {
  if (url.startsWith(PGLITE_PREFIX)) {
    return drizzlePglite({ client: new PGlite(url.slice(PGLITE_PREFIX.length)), schema });
  }
  return drizzleNeon({ client: new Pool({ connectionString: url }), schema });
}

// Créée au premier appel, jamais à l'import. Pas de Proxy JavaScript : Better Auth inspecte l'objet.
// Next.js charge ce module dans plusieurs paquets serveur (routes, pages) : l'instance vit sur
// globalThis, sinon deux PGlite ouvriraient le même dossier sans voir les écritures de l'autre.
const holder = globalThis as typeof globalThis & { __maroutineDb?: AppDatabase };

export function getDb(): AppDatabase {
  holder.__maroutineDb ??= createDb(env.DATABASE_URL);
  return holder.__maroutineDb;
}
