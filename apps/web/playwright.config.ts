import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORT}` },
  // La connexion est limitée à 5 essais par minute et par IP (T-04) : la connexion se fait une fois
  // (projet « setup », état enregistré dans e2e/.auth), et chaque projet présente sa propre IP.
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { extraHTTPHeaders: { "x-forwarded-for": "198.51.100.1" } },
    },
    {
      name: "iphone",
      dependencies: ["setup"],
      use: { ...devices["iPhone 15"], extraHTTPHeaders: { "x-forwarded-for": "198.51.100.2" } },
    },
    {
      name: "desktop",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        extraHTTPHeaders: { "x-forwarded-for": "198.51.100.3" },
      },
    },
  ],
  // Build de production (les en-têtes CSP ne sont posés qu'en production), sur une base PGlite
  // neuve en fichier qui contient le propriétaire de test (ADR 0010).
  webServer: {
    command: `pnpm e2e:prepare && pnpm build && pnpm start --port ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      DATABASE_URL: "pglite:./.data/e2e",
      BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e",
      BETTER_AUTH_URL: `http://localhost:${PORT}`,
    },
  },
});
