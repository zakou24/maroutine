import { productionDeps } from "@/server/routes/deps";
import { makeNutritionDaysRoutes } from "@/server/routes/nutrition-days";

export const { GET } = makeNutritionDaysRoutes(productionDeps);
