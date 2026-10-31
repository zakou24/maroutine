import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createExercise, createWorkout, parisDate } from "./api";
import { AUTH_FILE } from "./owner";

test.use({ storageState: AUTH_FILE });

// Un nom par projet et par essai : iPhone et ordinateur partagent la même base e2e.
const unique = (base: string, project: string) =>
  `${base} ${project} ${Math.random().toString(36).slice(2, 6)}`;

async function settled(page: Page) {
  await expect(page.getByText("Chargement…")).toHaveCount(0);
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => document.getAnimations().length === 0);
}

test("fiche exercice : tendance, suggestion, courbe et historique", async ({
  page,
  request,
}, testInfo) => {
  const name = unique("Fiche", testInfo.project.name);
  const id = await createExercise(request, name);
  for (const [daysAgo, weightKg] of [
    [40, 100],
    [33, 100],
    [26, 100],
    [19, 105],
    [12, 105],
    [5, 110],
  ] as const) {
    await createWorkout(request, parisDate(-daysAgo), [
      { exerciseId: id, sets: [{ weightKg, reps: 5 }] },
    ]);
  }

  await page.goto(`/exercices/${id}`);
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
  await expect(page.getByText("En progression")).toBeVisible();
  await expect(page.getByText("Dernier max estimé : 128,3 kg")).toBeVisible();
  const next = page.getByRole("region", { name: "Prochaine séance" });
  await expect(next).toContainText("110 kg × 6");
  await expect(next).toContainText("Tu as fait 110 × 5 : vise 110 × 6.");
  await expect(page.getByText("6 séances sur 3 mois, de 116,7 à 128,3 kg.")).toBeVisible();
  await expect(page.locator(".recharts-surface")).toBeVisible();
  await expect(page.getByRole("list", { name: "Historique" }).getByRole("link")).toHaveCount(6);

  await page.getByRole("button", { name: "1 mois" }).click();
  await expect(page.getByText("4 séances sur 1 mois, de 116,7 à 128,3 kg.")).toBeVisible();
  await expect(page.getByRole("list", { name: "Historique" }).getByRole("link")).toHaveCount(4);

  await settled(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("fiche d'un exercice au poids du corps sans pesée", async ({ page, request }, testInfo) => {
  const name = unique("Dips", testInfo.project.name);
  const id = await createExercise(request, name, "bodyweight");
  await createWorkout(request, parisDate(-2), [
    {
      exerciseId: id,
      sets: [
        { weightKg: 0, reps: 8 },
        { weightKg: 0, reps: 11 },
      ],
    },
  ]);
  await page.goto(`/exercices/${id}`);
  await expect(page.getByText("Meilleure série : poids du corps × 11")).toBeVisible();
  await expect(
    page.getByText("Le max estimé des exercices au poids du corps utilise ta pesée", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.locator(".recharts-surface")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Prochaine séance" })).toContainText(
    "poids du corps × 9",
  );
});
