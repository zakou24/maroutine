import { productionDeps } from "@/server/routes/deps";
import { makeFoodEntryRoutes } from "@/server/routes/food-entries";

export const { PATCH, DELETE } = makeFoodEntryRoutes(productionDeps);
