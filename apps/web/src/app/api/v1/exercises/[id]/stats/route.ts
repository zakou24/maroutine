import { productionDeps } from "@/server/routes/deps";
import { makeExerciseStatsRoutes } from "@/server/routes/stats";

export const { GET } = makeExerciseStatsRoutes(productionDeps);
