import { daysBetween, isoDateSchema } from "@maroutine/core";
import { z } from "zod";
import { nutritionDays } from "@/server/services/nutrition-days";
import type { RouteDeps } from "./deps";

const MAX_RANGE_DAYS = 400;

const rangeSchema = z
  .object({ from: isoDateSchema, to: isoDateSchema })
  .refine(({ from, to }) => to >= from && daysBetween(from, to) <= MAX_RANGE_DAYS, {
    message: "Plage de dates invalide.",
  });

// GET /api/v1/nutrition/days?from&to : totaux, objectif et statut de chaque jour (§6.7).
export function makeNutritionDaysRoutes({ db, apiHandler }: RouteDeps) {
  return {
    GET: apiHandler(async ({ request, session }) => {
      const { from, to } = rangeSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
      return Response.json(await nutritionDays(db(), session.userId, from, to));
    }),
  };
}
