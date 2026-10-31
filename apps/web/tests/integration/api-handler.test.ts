import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createApiHandler } from "@/server/http/api-handler";
import { NotFoundError } from "@/server/http/errors";
import type { SessionInfo } from "@/server/auth";

const APP = "https://maroutine.app";
const owner: SessionInfo = { userId: "owner", isDemo: false };
const demo: SessionInfo = { userId: "demo", isDemo: true };

function setup(session: SessionInfo | null) {
  const apiHandler = createApiHandler({ getSession: async () => session, appOrigin: APP });
  const inner = vi.fn(async () => Response.json({ ok: true }));
  return { route: apiHandler(inner), inner };
}

function req(method: string, origin?: string, body?: unknown) {
  const headers = new Headers({ "content-type": "application/json" });
  if (origin) headers.set("origin", origin);
  return new Request(`${APP}/api/v1/x`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const ctx = { params: Promise.resolve({}) };

describe("apiHandler", () => {
  it("sans session : 401 et le handler n'est pas appelé", async () => {
    const { route, inner } = setup(null);
    const res = await route(req("GET"), ctx);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    expect(inner).not.toHaveBeenCalled();
  });

  it("POST avec Origin étranger : 403 (T-07)", async () => {
    const { route, inner } = setup(owner);
    const res = await route(req("POST", "https://evil.example", {}), ctx);
    expect(res.status).toBe(403);
    expect(inner).not.toHaveBeenCalled();
  });

  it("POST sans en-tête Origin : 403", async () => {
    const { route } = setup(owner);
    expect((await route(req("POST", undefined, {}), ctx)).status).toBe(403);
  });

  it("POST de la même origine : passe", async () => {
    const { route } = setup(owner);
    expect((await route(req("POST", APP, {}), ctx)).status).toBe(200);
  });

  it("GET avec Origin étranger : passe (lecture)", async () => {
    const { route } = setup(owner);
    expect((await route(req("GET", "https://evil.example"), ctx)).status).toBe(200);
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])("compte démo : %s répond 403", async (method) => {
    const { route, inner } = setup(demo);
    const res = await route(req(method, APP, {}), ctx);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "demo_read_only" });
    expect(inner).not.toHaveBeenCalled();
  });

  it("compte démo : GET passe", async () => {
    const { route } = setup(demo);
    expect((await route(req("GET"), ctx)).status).toBe(200);
  });

  it("ZodError levée par le handler : 400 { error: 'invalid' }", async () => {
    const apiHandler = createApiHandler({ getSession: async () => owner, appOrigin: APP });
    const route = apiHandler(async () => {
      z.object({ a: z.number() }).parse({ a: "x" });
      return Response.json({});
    });
    const res = await route(req("GET"), ctx);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "invalid" });
  });

  it("NotFoundError : 404 { error: 'not_found' }", async () => {
    const apiHandler = createApiHandler({ getSession: async () => owner, appOrigin: APP });
    const route = apiHandler(async () => {
      throw new NotFoundError();
    });
    const res = await route(req("GET"), ctx);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });

  it("erreur inattendue : 500 { error: 'internal' } sans message interne", async () => {
    const apiHandler = createApiHandler({ getSession: async () => owner, appOrigin: APP });
    const route = apiHandler(async () => {
      throw new Error("connexion SQL perdue : secret");
    });
    const res = await route(req("GET"), ctx);
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: "internal" });
    expect(text).not.toContain("secret");
  });

  it("le handler reçoit l'utilisateur de la session, jamais celui du corps", async () => {
    const apiHandler = createApiHandler({ getSession: async () => owner, appOrigin: APP });
    let seen: string | undefined;
    const route = apiHandler(async ({ session }) => {
      seen = session.userId;
      return Response.json({});
    });
    await route(req("POST", APP, { userId: "autre" }), ctx);
    expect(seen).toBe("owner");
  });

  it("transmet les paramètres de route", async () => {
    const apiHandler = createApiHandler({ getSession: async () => owner, appOrigin: APP });
    let seen: unknown;
    const route = apiHandler<{ id: string }>(async ({ params }) => {
      seen = params;
      return Response.json({});
    });
    await route(req("GET"), { params: Promise.resolve({ id: "42" }) });
    expect(seen).toEqual({ id: "42" });
  });
});
