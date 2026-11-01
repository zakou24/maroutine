import { productionDeps } from "@/server/routes/deps";
import { makeNextSuggestionsRoutes } from "@/server/routes/stats";

export const { GET } = makeNextSuggestionsRoutes(productionDeps);
