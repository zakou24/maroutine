import { expect, test } from "@playwright/test";
import { AUTH_FILE } from "./owner";

test.use({ storageState: AUTH_FILE });

test("créer, modifier, archiver puis restaurer un exercice", async ({ page }, testInfo) => {
  // getByRole ignore les écrans précédents que Next.js garde cachés dans le DOM.
  // Un nom par projet : iPhone et ordinateur partagent la même base e2e.
  const name = `Tirage ${testInfo.project.name} ${Math.random().toString(36).slice(2, 6)}`;
  const link = new RegExp(`^${name}`);
  await page.goto("/exercices");
  await page.getByRole("link", { name: "Nouvel exercice" }).click();
  await page.getByRole("textbox", { name: "Nom" }).fill(name);
  await page.getByRole("combobox", { name: "Matériel" }).selectOption({ label: "Haltères" });
  await expect(page.getByRole("textbox", { name: "Pas d'augmentation (kg)" })).toHaveValue("2");
  await page.getByRole("button", { name: "Créer l'exercice" }).click();

  await expect(page).toHaveURL(/\/exercices$/);
  await page.getByRole("link", { name: link }).click();
  await page.getByRole("textbox", { name: "Répétitions maximum" }).fill("12");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(/\/exercices$/);
  await expect(page.getByRole("link", { name: link })).toContainText("6–12");

  await page.getByRole("link", { name: link }).click();
  await page.getByRole("button", { name: "Archiver" }).click();
  await expect(page).toHaveURL(/\/exercices$/);
  await expect(page.getByRole("link", { name: link })).toHaveCount(0);

  await page.getByText("Archivés").click();
  await page.getByRole("button", { name: `Restaurer ${name}` }).click();
  await expect(page.getByRole("link", { name: link })).toBeVisible();
});
