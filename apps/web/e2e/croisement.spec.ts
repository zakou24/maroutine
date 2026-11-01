import { expect, test } from "@playwright/test";
import { AUTH_FILE } from "./owner";

test.use({ storageState: AUTH_FILE });

test("le croisement s'ouvre depuis « Plus » et dit ce qui manque (F-TDB-4)", async ({ page }) => {
  await page.goto("/plus");
  await page.getByRole("link", { name: "Croisement" }).click();
  await expect(page.getByRole("heading", { name: "Croisement", level: 1 })).toBeVisible();
  // Base e2e neuve : aucune fenêtre alimentaire classée, donc aucun chiffre.
  await expect(
    page.getByRole("region", { name: "Tous exercices" }).getByText(/^Pas encore assez de données/),
  ).toBeVisible();
});
