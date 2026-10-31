import { productionDeps } from "@/server/routes/deps";
import { makeExerciseRoutes } from "@/server/routes/exercises";

export const { GET, PATCH } = makeExerciseRoutes(productionDeps);
