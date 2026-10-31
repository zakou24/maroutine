import { isoDateSchema, periodSchema } from "@maroutine/core";
import { z } from "zod";
import { resourceId } from "@/server/http/params";
import {
  exerciseStats,
  exerciseSuggestion,
  exerciseTrends,
  parisToday,
} from "@/server/services/stats";
import type { RouteDeps } from "./deps";

function query(request: Request) {
  return Object.fromEntries(new URL(request.url).searchParams);
}

const statsQuerySchema = z.object({ period: periodSchema });
const beforeSchema = z.object({ before: isoDateSchema.optional() });

// GET /api/v1/exercises/{id}/stats?period=1m|3m|1y|all
export function makeExerciseStatsRoutes({ db, apiHandler }: RouteDeps) {
  return {
    GET: apiHandler<{ id: string }>(async ({ request, session, params }) => {
      const id = resourceId(params.id);
      const { period } = statsQuerySchema.parse(query(request));
      return Response.json(await exerciseStats(db(), session.userId, id, period, parisToday()));
    }),
  };
}

// GET /api/v1/exercises/{id}/suggestion?before=AAAA-MM-JJ : la prochaine séance, avant cette date.
export function makeSuggestionRoutes({ db, apiHandler }: RouteDeps) {
  return {
    GET: apiHandler<{ id: string }>(async ({ request, session, params }) => {
      const id = resourceId(params.id);
      const { before } = beforeSchema.parse(query(request));
      return Response.json(await exerciseSuggestion(db(), session.userId, id, before));
    }),
  };
}

// GET /api/v1/exercises/trends : tendance et dernier max de chaque exercice actif.
export function makeExerciseTrendsRoutes({ db, apiHandler }: RouteDeps) {
  return {
    GET: apiHandler(async ({ session }) =>
      Response.json(await exerciseTrends(db(), session.userId, parisToday())),
    ),
  };
}
