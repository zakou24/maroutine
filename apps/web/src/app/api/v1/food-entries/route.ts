import { productionDeps } from "@/server/routes/deps";
import { makeFoodEntriesRoutes } from "@/server/routes/food-entries";

export const { GET, POST } = makeFoodEntriesRoutes(productionDeps);
