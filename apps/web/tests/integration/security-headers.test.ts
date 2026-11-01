import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function productionHeaders() {
  vi.stubEnv("NODE_ENV", "production");
  vi.resetModules();
  const config = (await import("../../next.config")).default;
  const [rule] = await config.headers!();
  return new Map(rule!.headers.map((h) => [h.key, h.value]));
}

it("autorise la caméra pour l'app seule, pour le scan (D29)", async () => {
  const headers = await productionHeaders();
  expect(headers.get("Permissions-Policy")).toBe("camera=(self), microphone=(), geolocation=()");
});

it("autorise WebAssembly sans ouvrir d'autre origine (D29)", async () => {
  const csp = (await productionHeaders()).get("Content-Security-Policy")!;
  expect(csp).toContain("script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'");
  expect(csp).toContain("connect-src 'self';");
});
