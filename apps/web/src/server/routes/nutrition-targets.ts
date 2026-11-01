import { nutritionTargetInputSchema } from "@maroutine/core";
import { readJson } from "@/server/http/read-json";
import { listTargets, putTarget } from "@/server/services/nutrition-targets";
import type { RouteDeps } from "./deps";

// GET et POST /api/v1/nutrition-targets (C8)
export function makeNutritionTargetsRoutes({ db, apiHandler }: RouteDeps) {
  return {
    GET: apiHandler(async ({ session }) => Response.json(await listTargets(db(), session.userId))),
    POST: apiHandler(async ({ request, session }) => {
      const input = await readJson(request, nutritionTargetInputSchema);
      return Response.json(await putTarget(db(), session.userId, input));
    }),
  };
}
