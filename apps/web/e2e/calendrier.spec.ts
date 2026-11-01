import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createExercise, createWorkout, parisDate } from "./api";
import { AUTH_FILE } from "./owner";

test.use({ storageState: AUTH_FILE });

function unique(name: string, project: string) {
  return `${name} ${project} ${Math.random().toString(36).slice(2, 6)}`;
}

test("la séance saisie apparaît sur l'accueil (activité et semaine) et dans le calendrier, et s'ouvre", async ({
  page,
  request,
}, testInfo) => {
  const name = unique("Presse", testInfo.project.name);
  const exerciseId = await createExercise(request, name);
  const today = parisDate();
  const id = await createWorkout(request, today, [
    {
      exerciseId,
      sets: [
        { weightKg: 120, reps: 10 },
        { weightKg: 120, reps: 9 },
      ],
    },
  ]);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Cette semaine" })).toBeVisible();
  await expect(page.locator(`a[href="/seances/${id}"]`)).toBeVisible();

  // Calendrier d'activité de l'accueil (D17) : la case du jour ouvre ses séances.
  const dayLabel = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  })
    .format(new Date())
    .replace(/^1 /, "1er ");
  const activity = page.getByRole("region", { name: "3 derniers mois" });
  // Nom du jour : date, nombre de séances, puis ses muscles (Lot 4.2).
  await activity
    .getByRole("button", { name: new RegExp(`^${dayLabel}, \\d+ séances?(, |$)`) })
    .click();
  await expect(activity.locator(`a[href="/seances/${id}"]`)).toBeVisible();

  await page.goto("/calendrier");
  await page
    .getByRole("button", { name: /séances?$/ })
    .and(page.locator('[aria-current="date"]'))
    .click();
  await page.locator(`a[href="/seances/${id}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/seances/${id}$`));
  await expect(page.getByRole("region", { name })).toBeVisible();
});

test("le calendrier change de mois par l'URL", async ({ page }) => {
  await page.goto("/calendrier?mois=2027-01");
  await expect(page.getByRole("heading", { name: "janvier 2027" })).toBeVisible();
  await page.getByRole("button", { name: "Mois précédent" }).click();
  await expect(page).toHaveURL(/mois=2026-12$/);
  await expect(page.getByRole("heading", { name: "décembre 2026" })).toBeVisible();
});

for (const [path, heading] of [
  ["/", "Accueil"],
  ["/saisie", "Séance du soir"],
  ["/exercices", "Exercices"],
  ["/calendrier", "Calendrier"],
  ["/poids", "Poids"],
  ["/alimentation", "Repas"],
  ["/alimentation/ajouter?meal=breakfast", "Ajouter"],
  ["/objectifs", "Objectifs"],
  ["/aliments", "Mes aliments"],
  ["/croisement", "Croisement"],
] as const) {
  test(`aucune violation axe ni défilement horizontal : ${heading}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    await expect(page.getByText("Chargement…")).toHaveCount(0);
    // Les boutons désactivés pendant le chargement ont une transition : on mesure l'état final.
    await page.waitForLoadState("networkidle");
    await expect(page.locator("button:disabled")).toHaveCount(0);
    await page.waitForFunction(() => document.getAnimations().length === 0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}
