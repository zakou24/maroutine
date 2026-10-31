import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { env } from "@/env";
import * as schema from "./schema";

// Type commun à Neon (production) et PGlite (tests) : les services ne dépendent que de lui.
export type AppDatabase = PgDatabase<PgQueryResultHKT, typeof schema>;

export function createDb(url: string): AppDatabase {
  return drizzle({ client: new Pool({ connectionString: url }), schema });
}

export const db = createDb(env.DATABASE_URL);
