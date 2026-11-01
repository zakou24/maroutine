import { productionDeps } from "@/server/routes/deps";
import { makeFoodBarcodeRoutes } from "@/server/routes/foods";

export const { GET } = makeFoodBarcodeRoutes(productionDeps);
