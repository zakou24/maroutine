import {
  copyEntriesSchema,
  foodEntryInputSchema,
  foodEntryPatchSchema,
  isoDateSchema,
} from "@maroutine/core";
import { z } from "zod";
import { resourceId } from "@/server/http/params";
import { readJson } from "@/server/http/read-json";
import {
  copyEntries,
  createEntry,
  dayJournal,
  deleteEntry,
  updateEntry,
} from "@/server/services/food-entries";
import type { RouteDeps } from "./deps";

const dateSchema = z.object({ date: isoDateSchema });

// GET /api/v1/food-entries?date, POST /api/v1/food-entries
export function makeFoodEntriesRoutes({ db, apiHandler }: RouteDeps) {
  return {
    GET: apiHandler(async ({ request, session }) => {
      const { date } = dateSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
      return Response.json(await dayJournal(db(), session.userId, date));
    }),
    POST: apiHandler(async ({ request, session }) => {
      const input = await readJson(request, foodEntryInputSchema);
      return Response.json(await createEntry(db(), session.userId, input), { status: 201 });
    }),
  };
}

// PATCH et DELETE /api/v1/food-entries/{id}
export function makeFoodEntryRoutes({ db, apiHandler }: RouteDeps) {
  return {
    PATCH: apiHandler<{ id: string }>(async ({ request, session, params }) => {
      const id = resourceId(params.id);
      const patch = await readJson(request, foodEntryPatchSchema);
      return Response.json(await updateEntry(db(), session.userId, id, patch));
    }),
    DELETE: apiHandler<{ id: string }>(async ({ session, params }) => {
      await deleteEntry(db(), session.userId, resourceId(params.id));
      return new Response(null, { status: 204 });
    }),
  };
}

// POST /api/v1/food-entries/copy (F-ALI-7)
export function makeCopyEntriesRoutes({ db, apiHandler }: RouteDeps) {
  return {
    POST: apiHandler(async ({ request, session }) => {
      const input = await readJson(request, copyEntriesSchema);
      return Response.json(await copyEntries(db(), session.userId, input), { status: 201 });
    }),
  };
}
