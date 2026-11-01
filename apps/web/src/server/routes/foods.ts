import { foodInputSchema, normalizeBarcode } from "@maroutine/core";
import { z } from "zod";
import { BadRequestError, ForbiddenError } from "@/server/http/errors";
import { resourceId } from "@/server/http/params";
import { readJson } from "@/server/http/read-json";
import {
  fetchOpenFoodFactsProduct,
  searchOpenFoodFacts,
  type OffProductFetch,
  type OffSearch,
} from "@/server/off-client";
import {
  createFood,
  deleteFood,
  foodByBarcode,
  listCustomFoods,
  recentFoods,
  searchFoods,
  updateFood,
} from "@/server/services/foods";
import type { RouteDeps } from "./deps";

const searchSchema = z.object({ q: z.string().trim().min(2).max(80) });
const OFF_TIMEOUT_MS = 3000;

// GET /api/v1/foods/search?q : perso, récents, puis Open Food Facts (§5, ADR 0007).
export function makeFoodSearchRoutes(
  { db, apiHandler }: RouteDeps,
  off: OffSearch = searchOpenFoodFacts,
  timeoutMs = OFF_TIMEOUT_MS,
) {
  return {
    GET: apiHandler(async ({ request, session }) => {
      // La recherche consomme le quota Open Food Facts de l'app : pas pour la démo (F-DEM-3, T-09).
      if (session.isDemo) throw new ForbiddenError("demo_read_only");
      const { q } = searchSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
      return Response.json(await searchFoods(db(), session.userId, q, off, timeoutMs));
    }),
  };
}

// GET /api/v1/foods/barcode/{code} : aliment scanné, du cache ou d'Open Food Facts (D29).
export function makeFoodBarcodeRoutes(
  { db, apiHandler }: RouteDeps,
  fetchProduct: OffProductFetch = fetchOpenFoodFactsProduct,
  timeoutMs = OFF_TIMEOUT_MS,
) {
  return {
    GET: apiHandler<{ code: string }>(async ({ session, params }) => {
      if (session.isDemo) throw new ForbiddenError("demo_read_only");
      const code = normalizeBarcode(params.code);
      if (!code) throw new BadRequestError("invalid_barcode");
      return Response.json(
        await foodByBarcode(db(), session.userId, code, fetchProduct, timeoutMs),
      );
    }),
  };
}

// GET /api/v1/foods/recent (F-ALI-6)
export function makeRecentFoodsRoutes({ db, apiHandler }: RouteDeps) {
  return {
    GET: apiHandler(async ({ session }) => Response.json(await recentFoods(db(), session.userId))),
  };
}

// GET et POST /api/v1/foods : aliments perso (F-ALI-2)
export function makeFoodsRoutes({ db, apiHandler }: RouteDeps) {
  return {
    GET: apiHandler(async ({ session }) =>
      Response.json(await listCustomFoods(db(), session.userId)),
    ),
    POST: apiHandler(async ({ request, session }) => {
      const input = await readJson(request, foodInputSchema);
      return Response.json(await createFood(db(), session.userId, input), { status: 201 });
    }),
  };
}

// PATCH et DELETE /api/v1/foods/{id} : aliments perso du propriétaire seulement.
export function makeFoodRoutes({ db, apiHandler }: RouteDeps) {
  return {
    PATCH: apiHandler<{ id: string }>(async ({ request, session, params }) => {
      const id = resourceId(params.id);
      const patch = await readJson(request, foodInputSchema.partial());
      return Response.json(await updateFood(db(), session.userId, id, patch));
    }),
    DELETE: apiHandler<{ id: string }>(async ({ session, params }) => {
      await deleteFood(db(), session.userId, resourceId(params.id));
      return new Response(null, { status: 204 });
    }),
  };
}
