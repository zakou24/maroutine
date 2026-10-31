import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    // Chaque base PGlite met 3 à 4 s à démarrer (WASM) : le délai par défaut de 5 s est trop juste.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    // Valeurs factices : les tests n'atteignent jamais Neon (base PGlite en mémoire).
    env: {
      DATABASE_URL: "postgres://test:test@localhost/test",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret",
      BETTER_AUTH_URL: "http://localhost:3000",
    },
  },
});
