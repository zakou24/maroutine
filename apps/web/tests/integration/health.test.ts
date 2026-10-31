import { expect, it } from "vitest";
import { GET } from "@/app/api/v1/health/route";

it("GET /api/v1/health répond ok sans session", async () => {
  const res = await GET();
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ status: "ok" });
});
