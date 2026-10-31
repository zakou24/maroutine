import { productionDeps } from "@/server/routes/deps";
import { makeExercisesBatchRoutes } from "@/server/routes/exercises";

export const { POST } = makeExercisesBatchRoutes(productionDeps);
