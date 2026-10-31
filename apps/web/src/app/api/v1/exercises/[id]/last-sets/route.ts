import { productionDeps } from "@/server/routes/deps";
import { makeLastSetsRoutes } from "@/server/routes/workouts";

export const { GET } = makeLastSetsRoutes(productionDeps);
