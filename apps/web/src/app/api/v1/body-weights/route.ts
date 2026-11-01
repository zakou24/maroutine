import { productionDeps } from "@/server/routes/deps";
import { makeBodyWeightsRoutes } from "@/server/routes/body-weights";

export const { GET } = makeBodyWeightsRoutes(productionDeps);
