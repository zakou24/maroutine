import { productionDeps } from "@/server/routes/deps";
import { makeFoodSearchRoutes } from "@/server/routes/foods";

export const { GET } = makeFoodSearchRoutes(productionDeps);
