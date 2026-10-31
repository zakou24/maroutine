import { getDb, type AppDatabase } from "@/db/client";
import { apiHandler, type ApiHandler } from "@/server/http/api-handler";

// Chaque module de routes /api/v1 se construit à partir de ces dépendances : les tests passent
// une base PGlite et une session choisie, la production passe celles-ci.
export type RouteDeps = { db: () => AppDatabase; apiHandler: ApiHandler };

export const productionDeps: RouteDeps = { db: getDb, apiHandler };
