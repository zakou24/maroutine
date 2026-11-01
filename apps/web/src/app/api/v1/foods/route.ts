import { productionDeps } from "@/server/routes/deps";
import { makeFoodsRoutes } from "@/server/routes/foods";

export const { POST } = makeFoodsRoutes(productionDeps);
