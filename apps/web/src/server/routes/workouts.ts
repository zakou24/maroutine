import { daysBetween, isoDateSchema, workoutInputSchema } from "@maroutine/core";
import { z } from "zod";
import { resourceId } from "@/server/http/params";
import { readJson } from "@/server/http/read-json";
import {
  createWorkout,
  deleteWorkout,
  getWorkout,
  lastSets,
  listWorkouts,
  replaceWorkout,
} from "@/server/services/workouts";
import type { RouteDeps } from "./deps";

const MAX_RANGE_DAYS = 400;

const rangeSchema = z
  .object({ from: isoDateSchema, to: isoDateSchema })
  .refine(({ from, to }) => to >= from && daysBetween(from, to) <= MAX_RANGE_DAYS, {
    message: `Période de 0 à ${MAX_RANGE_DAYS} jours attendue.`,
  });

function query(request: Request) {
  return Object.fromEntries(new URL(request.url).searchParams);
}

// GET /api/v1/workouts?from&to, POST /api/v1/workouts
export function makeWorkoutsRoutes({ db, apiHandler }: RouteDeps) {
  return {
    GET: apiHandler(async ({ request, session }) => {
      const { from, to } = rangeSchema.parse(query(request));
      return Response.json(await listWorkouts(db(), session.userId, from, to));
    }),
    POST: apiHandler(async ({ request, session }) => {
      const input = await readJson(request, workoutInputSchema);
      return Response.json(await createWorkout(db(), session.userId, input), { status: 201 });
    }),
  };
}

// GET, PUT et DELETE /api/v1/workouts/{id}
export function makeWorkoutRoutes({ db, apiHandler }: RouteDeps) {
  return {
    GET: apiHandler<{ id: string }>(async ({ session, params }) =>
      Response.json(await getWorkout(db(), session.userId, resourceId(params.id))),
    ),
    PUT: apiHandler<{ id: string }>(async ({ request, session, params }) => {
      const id = resourceId(params.id);
      const input = await readJson(request, workoutInputSchema);
      return Response.json(await replaceWorkout(db(), session.userId, id, input));
    }),
    DELETE: apiHandler<{ id: string }>(async ({ session, params }) => {
      await deleteWorkout(db(), session.userId, resourceId(params.id));
      return new Response(null, { status: 204 });
    }),
  };
}

const beforeSchema = z.object({ before: isoDateSchema.optional() });

// GET /api/v1/exercises/{id}/last-sets?before=AAAA-MM-JJ : préremplissage de la saisie.
export function makeLastSetsRoutes({ db, apiHandler }: RouteDeps) {
  return {
    GET: apiHandler<{ id: string }>(async ({ request, session, params }) => {
      const id = resourceId(params.id);
      const { before } = beforeSchema.parse(query(request));
      return Response.json(
        await lastSets(db(), session.userId, id, before ? { performedOn: before } : undefined),
      );
    }),
  };
}
