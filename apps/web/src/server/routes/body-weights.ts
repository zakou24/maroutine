import { isoDateSchema, weighInInputSchema } from "@maroutine/core";
import { z } from "zod";
import { readJson } from "@/server/http/read-json";
import { deleteBodyWeight, listBodyWeights, putBodyWeight } from "@/server/services/body-weights";
import { parisToday } from "@/server/services/stats";
import type { RouteDeps } from "./deps";

// Sans `from`, tout l'historique : la courbe a une période « Tout ».
const rangeSchema = z.object({ from: isoDateSchema.optional(), to: isoDateSchema.optional() });

function query(request: Request) {
  return Object.fromEntries(new URL(request.url).searchParams);
}

// GET /api/v1/body-weights?from&to
export function makeBodyWeightsRoutes({ db, apiHandler }: RouteDeps) {
  return {
    GET: apiHandler(async ({ request, session }) => {
      const range = rangeSchema.parse(query(request));
      return Response.json(await listBodyWeights(db(), session.userId, range));
    }),
  };
}

// PUT et DELETE /api/v1/body-weights/{AAAA-MM-JJ}
export function makeBodyWeightRoutes({ db, apiHandler }: RouteDeps) {
  return {
    PUT: apiHandler<{ date: string }>(async ({ request, session, params }) => {
      const date = isoDateSchema.parse(params.date);
      const { weightKg } = await readJson(request, weighInInputSchema);
      return Response.json(await putBodyWeight(db(), session.userId, date, weightKg, parisToday()));
    }),
    DELETE: apiHandler<{ date: string }>(async ({ session, params }) => {
      const date = isoDateSchema.parse(params.date);
      await deleteBodyWeight(db(), session.userId, date);
      return new Response(null, { status: 204 });
    }),
  };
}
