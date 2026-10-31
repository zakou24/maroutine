import { productionDeps } from "@/server/routes/deps";
import { makeWorkoutRoutes } from "@/server/routes/workouts";

export const { GET, PUT, DELETE } = makeWorkoutRoutes(productionDeps);
