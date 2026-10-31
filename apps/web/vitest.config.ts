import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    // Valeurs factices : les tests n'atteignent jamais Neon (base PGlite en mémoire).
    env: {
      DATABASE_URL: "postgres://test:test@localhost/test",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret",
      BETTER_AUTH_URL: "http://localhost:3000",
    },
  },
});
