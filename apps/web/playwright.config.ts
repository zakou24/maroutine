import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 15"] } },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  // Build de production : les en-têtes (CSP) ne sont posés qu'en production.
  // Aucun test e2e du Lot 0 n'atteint la base : DATABASE_URL est factice.
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      DATABASE_URL: "postgres://e2e:e2e@localhost:5432/e2e",
      BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e",
      BETTER_AUTH_URL: `http://localhost:${PORT}`,
    },
  },
});
