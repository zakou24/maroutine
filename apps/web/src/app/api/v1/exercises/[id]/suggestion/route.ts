import { productionDeps } from "@/server/routes/deps";
import { makeSuggestionRoutes } from "@/server/routes/stats";

export const { GET } = makeSuggestionRoutes(productionDeps);
