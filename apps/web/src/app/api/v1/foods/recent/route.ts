import { productionDeps } from "@/server/routes/deps";
import { makeRecentFoodsRoutes } from "@/server/routes/foods";

export const { GET } = makeRecentFoodsRoutes(productionDeps);
