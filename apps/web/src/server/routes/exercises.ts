import { exerciseInputSchema, exercisePatchSchema } from "@maroutine/core";
import { z } from "zod";
import { resourceId } from "@/server/http/params";
import { readJson } from "@/server/http/read-json";
import {
  createExercise,
  getExercise,
  listExercises,
  updateExercise,
} from "@/server/services/exercises";
import type { RouteDeps } from "./deps";

const filterSchema = z.enum(["active", "archived", "all"]).default("active");

// GET /api/v1/exercises?filter=active|archived|all, POST /api/v1/exercises
export function makeExercisesRoutes({ db, apiHandler }: RouteDeps) {
  return {
    GET: apiHandler(async ({ request, session }) => {
      const filter = filterSchema.parse(
        new URL(request.url).searchParams.get("filter") ?? undefined,
      );
      return Response.json(await listExercises(db(), session.userId, filter));
    }),
    POST: apiHandler(async ({ request, session }) => {
      const input = await readJson(request, exerciseInputSchema);
      return Response.json(await createExercise(db(), session.userId, input), { status: 201 });
    }),
  };
}

// GET et PATCH /api/v1/exercises/{id}. Pas de DELETE : un exercice s'archive (F-SEA-1).
export function makeExerciseRoutes({ db, apiHandler }: RouteDeps) {
  return {
    GET: apiHandler<{ id: string }>(async ({ session, params }) =>
      Response.json(await getExercise(db(), session.userId, resourceId(params.id))),
    ),
    PATCH: apiHandler<{ id: string }>(async ({ request, session, params }) => {
      const id = resourceId(params.id);
      const patch = await readJson(request, exercisePatchSchema);
      return Response.json(await updateExercise(db(), session.userId, id, patch));
    }),
  };
}
