import { fileURLToPath, pathToFileURL } from "node:url";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";

// Seul le déploiement de production migre : les aperçus partagent la base de production (ADR 0010).
export function migrationTarget(env: Record<string, string | undefined>): string | null {
  if (env.VERCEL_ENV !== "production") return null;
  const url = (env.DATABASE_URL_UNPOOLED || env.DATABASE_URL || "").trim();
  if (!url) throw new Error("DATABASE_URL_UNPOOLED ou DATABASE_URL manquante pour la migration.");
  return url;
}

async function main() {
  const url = migrationTarget(process.env);
  if (!url) {
    console.log("[migrate] hors production : aucune migration.");
    return;
  }
  const pool = new Pool({ connectionString: url });
  try {
    await migrate(drizzle({ client: pool }), {
      migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
    });
    console.log("[migrate] migrations appliquées.");
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error("[migrate] échec :", error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
