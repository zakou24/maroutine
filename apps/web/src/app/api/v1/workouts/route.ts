import { productionDeps } from "@/server/routes/deps";
import { makeWorkoutsRoutes } from "@/server/routes/workouts";

export const { GET, POST } = makeWorkoutsRoutes(productionDeps);
