import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

type ManifestIcon = { src: string; sizes: string; type?: string; purpose?: string };

test("manifeste installable (F-SOC-3, NF-3)", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);
  const m = await res.json();
  expect(m).toMatchObject({
    name: "MaRoutine",
    short_name: "MaRoutine",
    display: "standalone",
    start_url: "/",
    lang: "fr",
  });
  const icons = m.icons as ManifestIcon[];
  expect(icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  for (const icon of icons) {
    const iconRes = await request.get(icon.src);
    expect(iconRes.status()).toBe(200);
    expect(iconRes.headers()["content-type"]).toBe("image/png");
  }
});

test("métadonnées iPhone présentes", async ({ page }) => {
  await page.goto("/connexion");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute(
    "content",
    "MaRoutine",
  );
});

test("en-têtes de sécurité (T-06)", async ({ request }) => {
  const h = (await request.get("/connexion")).headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});

test("sans session, / redirige vers /connexion", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/connexion$/);
});

test("connexion : aucun défilement horizontal et aucune violation axe", async ({ page }) => {
  await page.goto("/connexion");
  await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
