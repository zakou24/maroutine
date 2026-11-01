import { productionDeps } from "@/server/routes/deps";
import { makeNutritionTargetsRoutes } from "@/server/routes/nutrition-targets";

export const { GET, POST } = makeNutritionTargetsRoutes(productionDeps);
