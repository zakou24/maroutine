import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL && existsSync(".env.local")) process.loadEnvFile(".env.local");

// Migrations : l'URL directe de Neon si elle existe (le pooler gère mal les transactions longues).
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";
const PGLITE_PREFIX = "pglite:";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema",
  out: "./drizzle",
  // « pglite:./.data/dev » : base locale de développement (ADR 0010).
  ...(url.startsWith(PGLITE_PREFIX)
    ? { driver: "pglite", dbCredentials: { url: url.slice(PGLITE_PREFIX.length) } }
    : { dbCredentials: { url } }),
});
