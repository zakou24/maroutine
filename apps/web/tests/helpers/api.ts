import { user } from "@/db/schema";
import type { AppDatabase } from "@/db/client";
import type { SessionInfo } from "@/server/auth";
import { createApiHandler } from "@/server/http/api-handler";
import type { RouteDeps } from "@/server/routes/deps";

export const APP = "http://localhost:3000";

type AnyRoute = (request: Request, ctx: { params: Promise<never> }) => Promise<Response>;

// Appelle une route /api/v1 comme le ferait Next.js, avec une session choisie et une base de test.
export async function callRoute<R extends Record<string, unknown>>(
  makeRoutes: (deps: RouteDeps) => R,
  options: {
    db: AppDatabase;
    method: keyof R & string;
    url: string;
    session: SessionInfo | null;
    body?: unknown;
    params?: Record<string, string>;
  },
): Promise<{ status: number; body: unknown }> {
  const apiHandler = createApiHandler({ getSession: async () => options.session, appOrigin: APP });
  const routes = makeRoutes({ db: () => options.db, apiHandler });
  const route = routes[options.method] as AnyRoute;
  const request = new Request(new URL(options.url, APP), {
    method: options.method,
    headers: { "content-type": "application/json", origin: APP },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const res = await route(request, {
    params: Promise.resolve(options.params ?? {}) as Promise<never>,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : undefined };
}

// Les tables métier référencent "user" : chaque test crée ses utilisateurs.
export async function insertUser(db: AppDatabase, id: string): Promise<SessionInfo> {
  await db.insert(user).values({ id, name: id, email: `${id}@test.local` });
  return { userId: id, isDemo: false };
}
