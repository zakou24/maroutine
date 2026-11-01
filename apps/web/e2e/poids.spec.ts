import { expect, test } from "@playwright/test";
import { createExercise, createWorkout, parisDate, putBodyWeight } from "./api";
import { AUTH_FILE } from "./owner";

test.use({ storageState: AUTH_FILE });

test("pesée du jour depuis l'accueil, remplacée puis supprimée sur l'écran Poids", async ({
  page,
}, testInfo) => {
  // La pesée du jour est unique : un seul projet l'écrit, l'autre écrirait la même date.
  test.skip(testInfo.project.name !== "iphone", "pesée du jour partagée entre projets");
  await page.goto("/");
  const field = page.getByRole("textbox", { name: "Pesée du jour (kg)" });
  await field.fill("78,4");
  await page
    .getByRole("region", { name: "Poids" })
    .getByRole("button", { name: /Enregistrer|Remplacer/ })
    .click();
  await expect(page.getByText("Pesée enregistrée.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Poids" })).toContainText("78,4 kg, le");

  await page.getByRole("link", { name: "Voir la courbe" }).click();
  await expect(page.getByRole("heading", { name: "Poids", level: 1 })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Pesée (kg)" })).toHaveValue("78,4");
  await page.getByRole("textbox", { name: "Pesée (kg)" }).fill("78,1");
  await page.getByRole("button", { name: "Remplacer" }).click();
  const list = page.getByRole("list", { name: "Pesées" });
  await expect(list.getByRole("listitem").first()).toContainText("78,1 kg");

  await list
    .getByRole("button", { name: /^Supprimer la pesée du / })
    .first()
    .click();
  await expect(page.getByRole("textbox", { name: "Pesée (kg)" })).toHaveValue("");
});

test("une pesée à une date passée, et une saisie refusée", async ({ page }, testInfo) => {
  const date = parisDate(testInfo.project.name === "iphone" ? -40 : -41);
  await page.goto("/poids");
  await page.getByLabel("Date de la pesée").fill(date);
  const field = page.getByRole("textbox", { name: "Pesée (kg)" });
  await field.fill("78,45");
  await page.getByRole("button", { name: /Enregistrer|Remplacer/ }).click();
  await expect(page.getByText("La pesée prend une décimale au plus.")).toBeVisible();
  await field.fill("81,2");
  await page.getByRole("button", { name: /Enregistrer|Remplacer/ }).click();
  await expect(page.getByText("Pesée enregistrée.")).toBeVisible();
  await expect(page.getByRole("list", { name: "Pesées" })).toContainText("81,2 kg");
});

test("un exercice au poids du corps a un max estimé grâce à la pesée (C5)", async ({
  page,
  request,
}, testInfo) => {
  const name = `Tractions ${testInfo.project.name} ${Math.random().toString(36).slice(2, 6)}`;
  const id = await createExercise(request, name, "bodyweight");
  await createWorkout(request, parisDate(-2), [
    { exerciseId: id, sets: [{ weightKg: 0, reps: 8 }] },
  ]);
  await putBodyWeight(request, parisDate(-3), 80);
  await page.goto(`/exercices/${id}`);
  // 80 × (1 + 8/30) = 101,33
  await expect(page.getByText("Dernier max estimé : 101,3 kg")).toBeVisible();
  await expect(page.locator(".recharts-surface")).toBeVisible();
});
