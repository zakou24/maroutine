import { describe, expect, it, vi } from "vitest";
import { z, ZodError } from "zod";
import { createApiHandler } from "@/server/http/api-handler";
import { BadRequestError, UnsupportedMediaTypeError } from "@/server/http/errors";
import { readJson } from "@/server/http/read-json";

const APP = "https://maroutine.app";
const schema = z.object({ name: z.string() });

function post(body: string, contentType = "application/json") {
  return new Request(`${APP}/api/v1/x`, {
    method: "POST",
    headers: { "content-type": contentType, origin: APP },
    body,
  });
}

describe("readJson", () => {
  it("refuse un corps non JSON : 415", async () => {
    await expect(readJson(post("name=a", "text/plain"), schema)).rejects.toBeInstanceOf(
      UnsupportedMediaTypeError,
    );
  });

  it("refuse un JSON illisible : 400 invalid_json", async () => {
    const error = await readJson(post("{"), schema).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BadRequestError);
    expect((error as BadRequestError).code).toBe("invalid_json");
  });

  it("valide avec le schéma : ZodError", async () => {
    await expect(readJson(post('{"name":1}'), schema)).rejects.toBeInstanceOf(ZodError);
  });

  it("renvoie la valeur validée", async () => {
    expect(
      await readJson(post('{"name":"a","extra":1}', "application/json; charset=utf-8"), schema),
    ).toEqual({
      name: "a",
    });
  });
});

describe("readJson via apiHandler", () => {
  const apiHandler = createApiHandler({
    getSession: async () => ({ userId: "owner", isDemo: false }),
    appOrigin: APP,
  });
  const route = apiHandler(async ({ request }) => Response.json(await readJson(request, schema)));
  const ctx = { params: Promise.resolve({}) };

  it("type de contenu refusé : 415 unsupported_media_type", async () => {
    const res = await route(post("name=a", "text/plain"), ctx);
    expect(res.status).toBe(415);
    expect(await res.json()).toEqual({ error: "unsupported_media_type" });
  });

  it("JSON illisible : 400 invalid_json", async () => {
    const res = await route(post("{"), ctx);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_json" });
  });

  it("schéma non respecté : 400 invalid", async () => {
    const res = await route(post('{"name":1}'), ctx);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "invalid" });
  });

  it("ConflictError : 409 avec son code", async () => {
    const { ConflictError } = await import("@/server/http/errors");
    const conflict = apiHandler(async () => {
      throw new ConflictError("duplicate_name");
    });
    const res = await conflict(post("{}"), ctx);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "duplicate_name" });
  });

  it("le journal d'une erreur 500 contient le nom de l'erreur", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = apiHandler(async () => {
      throw new TypeError("secret");
    });
    await failing(post("{}"), ctx);
    expect(spy.mock.calls[0]?.join(" ")).toContain("TypeError");
    expect(spy.mock.calls[0]?.join(" ")).not.toContain("secret");
    spy.mockRestore();
  });
});
