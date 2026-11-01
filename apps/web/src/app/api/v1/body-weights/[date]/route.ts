import { productionDeps } from "@/server/routes/deps";
import { makeBodyWeightRoutes } from "@/server/routes/body-weights";

export const { PUT, DELETE } = makeBodyWeightRoutes(productionDeps);
