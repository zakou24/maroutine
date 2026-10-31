import { productionDeps } from "@/server/routes/deps";
import { makeExerciseTrendsRoutes } from "@/server/routes/stats";

export const { GET } = makeExerciseTrendsRoutes(productionDeps);
