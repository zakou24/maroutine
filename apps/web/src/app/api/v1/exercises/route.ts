import { productionDeps } from "@/server/routes/deps";
import { makeExercisesRoutes } from "@/server/routes/exercises";

export const { GET, POST } = makeExercisesRoutes(productionDeps);
