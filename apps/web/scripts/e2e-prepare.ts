import { mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { createOwner } from "@/server/create-owner";

// Base e2e neuve à chaque lancement : migrations, puis le propriétaire de test (identifiants publics, base jetable).
export const E2E_OWNER = { email: "e2e@maroutine.test", password: "e2e-mot-de-passe-solide" };
const DIR = "./.data/e2e";

async function main() {
  rmSync(DIR, { recursive: true, force: true });
  mkdirSync(DIR, { recursive: true });
  const client = new PGlite(DIR);
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) });
  const result = await createOwner(db, E2E_OWNER);
  // La base doit être fermée avant que `next start` ne l'ouvre : PGlite n'accepte qu'un processus.
  await client.close();
  if (!result.ok) throw new Error(result.reason);
  console.log(`[e2e] base prête dans ${DIR}`);
}

void main();
