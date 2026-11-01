import { productionDeps } from "@/server/routes/deps";
import { makeCopyEntriesRoutes } from "@/server/routes/food-entries";

export const { POST } = makeCopyEntriesRoutes(productionDeps);
