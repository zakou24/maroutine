import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/lib/api";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);
afterEach(() => fetchMock.mockReset());

describe("apiFetch", () => {
  it("apiFetch envoie du JSON et renvoie le corps", async () => {
    fetchMock.mockResolvedValue(Response.json({ id: "1" }, { status: 201 }));
    const result = await apiFetch<{ id: string }>("/api/v1/exercises", {
      method: "POST",
      body: { name: "Squat" },
    });
    expect(result).toEqual({ id: "1" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/exercises");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("content-type")).toBe("application/json");
    expect(init.body).toBe('{"name":"Squat"}');
  });

  it("une lecture n'envoie pas de corps", async () => {
    fetchMock.mockResolvedValue(Response.json([]));
    await apiFetch("/api/v1/exercises");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
  });

  it("apiFetch lève ApiError(404, 'not_found')", async () => {
    fetchMock.mockResolvedValue(Response.json({ error: "not_found" }, { status: 404 }));
    const error = await apiFetch("/api/v1/workouts/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, code: "not_found" });
  });

  it("une erreur sans corps JSON garde son statut", async () => {
    fetchMock.mockResolvedValue(new Response("Bad gateway", { status: 502 }));
    await expect(apiFetch("/api/v1/x")).rejects.toMatchObject({ status: 502, code: "unknown" });
  });

  it("apiFetch renvoie undefined sur 204", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    expect(await apiFetch("/api/v1/workouts/x", { method: "DELETE" })).toBeUndefined();
  });

  it("une panne réseau remonte telle quelle (TypeError)", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(apiFetch("/api/v1/x")).rejects.toBeInstanceOf(TypeError);
  });
});
