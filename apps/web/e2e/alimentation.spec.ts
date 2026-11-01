import { expect, test } from "@playwright/test";
import { parisDate } from "./api";
import { AUTH_FILE } from "./owner";

test.use({ storageState: AUTH_FILE });

test("objectif, aliment perso, ajout rapide, modification, suppression et copie", async ({
  page,
}, testInfo) => {
  // Un jour au hasard loin dans le passé : iPhone, ordinateur et nouvel essai ne se croisent pas.
  const offset = -(300 + Math.floor(Math.random() * 5000));
  const day = parisDate(offset);
  const next = parisDate(offset + 1);
  const name = `Skyr ${testInfo.project.name} ${Math.random().toString(36).slice(2, 6)}`;

  await page.goto("/objectifs");
  await page.getByLabel("À partir du").fill(day);
  await page.getByRole("textbox", { name: "Calories (kcal)" }).fill("2400");
  await page.getByRole("textbox", { name: "Protéines (g)" }).fill("150");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Objectifs enregistrés.")).toBeVisible();

  await page.goto(`/alimentation?date=${day}`);
  await page.getByRole("link", { name: "Ajouter au petit-déjeuner" }).click();
  await page.getByRole("button", { name: "Nouvel aliment perso" }).click();
  await page.getByRole("textbox", { name: "Nom" }).fill(name);
  await page.getByRole("textbox", { name: "Calories pour 100 g" }).fill("62");
  await page.getByRole("textbox", { name: "Protéines pour 100 g" }).fill("11");
  await page.getByRole("button", { name: "Créer l'aliment" }).click();
  await page.getByRole("textbox", { name: "Quantité (g)" }).fill("150");
  await expect(page.getByText("93 kcal · 16,5 g de protéines")).toBeVisible();
  await page.getByRole("button", { name: "Ajouter au petit-déjeuner" }).click();

  await expect(page).toHaveURL(new RegExp(`/alimentation\\?date=${day}$`));
  const breakfast = page.getByRole("region", { name: "Petit-déjeuner" });
  await expect(breakfast).toContainText(name);
  await expect(page.getByText(/^93 \/ 2\s400 kcal$/)).toBeVisible();

  await page.getByRole("link", { name: "Ajouter au dîner" }).click();
  await page.getByRole("button", { name: "Ajout rapide" }).click();
  await page.getByRole("textbox", { name: "Libellé" }).fill("Pizza");
  await page.getByRole("textbox", { name: "Calories (kcal)" }).fill("800");
  await page.getByRole("textbox", { name: "Protéines (g)" }).fill("30");
  await page.getByRole("button", { name: "Ajouter au dîner" }).click();
  await expect(page.getByRole("region", { name: "Dîner" })).toContainText("Pizza");

  await breakfast.getByRole("button", { name: `Modifier ${name}` }).click();
  await breakfast.getByRole("textbox", { name: "Quantité (g)" }).fill("300");
  await breakfast.getByRole("button", { name: "Enregistrer" }).click();
  await expect(breakfast).toContainText("300 g · 186 kcal");

  await page
    .getByRole("region", { name: "Dîner" })
    .getByRole("button", { name: "Supprimer Pizza" })
    .click();
  await expect(page.getByRole("region", { name: "Dîner" })).not.toContainText("Pizza");

  await page.getByRole("button", { name: "Jour suivant" }).click();
  await expect(page).toHaveURL(new RegExp(`date=${next}$`));
  await page.getByRole("button", { name: "Copier" }).click();
  await expect(page.getByText("1 entrée copiée.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Petit-déjeuner" })).toContainText(name);
});
