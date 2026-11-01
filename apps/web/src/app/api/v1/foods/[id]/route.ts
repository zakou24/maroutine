import { productionDeps } from "@/server/routes/deps";
import { makeFoodRoutes } from "@/server/routes/foods";

export const { PATCH, DELETE } = makeFoodRoutes(productionDeps);
