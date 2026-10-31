import { expect, test } from "@playwright/test";

// Propriétaire créé par `pnpm e2e:prepare` dans la base PGlite e2e.
const OWNER = { email: "e2e@maroutine.test", password: "e2e-mot-de-passe-solide" };

test("le propriétaire se connecte, voit « Cette semaine » et se déconnecte", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("Email").fill(OWNER.email);
  await page.getByLabel("Mot de passe").fill(OWNER.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("heading", { name: "Cette semaine" })).toBeVisible();

  await page.getByRole("link", { name: "Plus" }).click();
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/connexion$/);
});

test("un mauvais mot de passe affiche « Email ou mot de passe incorrect. »", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("Email").fill(OWNER.email);
  await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "Email ou mot de passe incorrect.",
  );
});
