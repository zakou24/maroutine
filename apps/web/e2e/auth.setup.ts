import { expect, test as setup } from "@playwright/test";
import { AUTH_FILE, OWNER } from "./owner";

setup("connexion du propriétaire de test", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("Email").fill(OWNER.email);
  await page.getByLabel("Mot de passe").fill(OWNER.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("heading", { name: "Cette semaine" })).toBeVisible();
  await page.context().storageState({ path: AUTH_FILE });
});
