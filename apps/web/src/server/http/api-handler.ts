import { ZodError } from "zod";
import { env } from "@/env";
import { getSessionInfo, type SessionInfo } from "@/server/auth";
import { BadRequestError, NotFoundError } from "./errors";

type ApiContext<P> = { request: Request; session: SessionInfo; params: P };
type Handler<P> = (ctx: ApiContext<P>) => Promise<Response>;
type Route<P> = (request: Request, route: { params: Promise<P> }) => Promise<Response>;

const READ_METHODS = new Set(["GET", "HEAD"]);

// Toutes les routes /api/v1 passent par ici : session (401), origine (T-07), démo en lecture seule (T-02).
export function createApiHandler(deps: {
  getSession: (headers: Headers) => Promise<SessionInfo | null>;
  appOrigin: string;
}) {
  const appOrigin = new URL(deps.appOrigin).origin;

  return function apiHandler<P = Record<string, string>>(handler: Handler<P>): Route<P> {
    return async (request, route) => {
      try {
        const session = await deps.getSession(request.headers);
        if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

        if (!READ_METHODS.has(request.method)) {
          if (request.headers.get("origin") !== appOrigin) {
            return Response.json({ error: "forbidden_origin" }, { status: 403 });
          }
          if (session.isDemo) return Response.json({ error: "demo_read_only" }, { status: 403 });
        }

        return await handler({ request, session, params: await route.params });
      } catch (error) {
        if (error instanceof ZodError) {
          return Response.json({ error: "invalid", issues: error.issues }, { status: 400 });
        }
        if (error instanceof BadRequestError) {
          return Response.json({ error: error.code }, { status: error.status });
        }
        if (error instanceof NotFoundError) {
          return Response.json({ error: "not_found" }, { status: 404 });
        }
        // Jamais le corps de la requête ni le message interne dans la réponse (T-11).
        const name = error instanceof Error ? error.name : typeof error;
        console.error(`[api] ${request.method} ${new URL(request.url).pathname} → 500 (${name})`);
        return Response.json({ error: "internal" }, { status: 500 });
      }
    };
  };
}

export type ApiHandler = ReturnType<typeof createApiHandler>;

export const apiHandler = createApiHandler({
  getSession: getSessionInfo,
  appOrigin: env.BETTER_AUTH_URL,
});
