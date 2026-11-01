import { productionDeps } from "@/server/routes/deps";
import { makeCrossingRoutes } from "@/server/routes/stats";

export const { GET } = makeCrossingRoutes(productionDeps);
