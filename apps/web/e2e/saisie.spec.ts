import { expect, test, type Page } from "@playwright/test";
import { createExercise, createWorkout, getWorkout, parisDate } from "./api";
import { AUTH_FILE } from "./owner";

test.use({ storageState: AUTH_FILE });

// iPhone et ordinateur partagent la base e2e : chaque test nomme ses exercices pour lui seul.
function unique(name: string, project: string) {
  return `${name} ${project} ${Math.random().toString(36).slice(2, 6)}`;
}

async function addExercise(page: Page, name: string) {
  await page.getByRole("button", { name: "Ajouter un exercice" }).click();
  await page.getByRole("list", { name: "Tes exercices" }).getByRole("button", { name }).click();
  return page.getByRole("region", { name });
}

test("séance complète : 2 exercices, échauffement, 15 min de cardio, enregistrer, la séance s'ouvre", async ({
  page,
  request,
}, testInfo) => {
  const bench = unique("Développé", testInfo.project.name);
  const squat = unique("Squat", testInfo.project.name);
  await createExercise(request, bench);
  await createExercise(request, squat);

  await page.goto("/saisie");
  await expect(page.getByRole("heading", { name: "Séance du soir" })).toBeVisible();
  const benchCard = await addExercise(page, bench);
  await benchCard.getByRole("textbox", { name: "Charge (kg), série 1" }).fill("62,5");
  await benchCard.getByRole("textbox", { name: "Répétitions, série 1" }).fill("8");
  await benchCard.getByRole("button", { name: "Ajouter une série" }).click();
  await benchCard.getByRole("textbox", { name: "Répétitions, série 2" }).fill("7");

  const squatCard = await addExercise(page, squat);
  await squatCard.getByRole("textbox", { name: "Charge (kg), série 1" }).fill("80");
  await squatCard.getByRole("textbox", { name: "Répétitions, série 1" }).fill("6");
  await page.getByRole("checkbox", { name: "Échauffement fait" }).check();
  await page.getByRole("checkbox", { name: "Cardio" }).check();
  await page.getByRole("button", { name: "15 min" }).click();

  await page.getByRole("button", { name: "Enregistrer la séance" }).click();
  await expect(page).toHaveURL(/\/seances\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: /^Séance du / })).toBeVisible();
  const saved = page.getByRole("region", { name: bench });
  await expect(saved.getByRole("textbox", { name: "Charge (kg), série 2" })).toHaveValue("62,5");
  await expect(saved.getByRole("textbox", { name: "Répétitions, série 2" })).toHaveValue("7");
  await expect(page.getByRole("checkbox", { name: "Échauffement fait" })).toBeChecked();
  await expect(page.getByRole("button", { name: "15 min" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("préremplissage : la séance suivante reprend les séries, on ne modifie qu'une série (NF-1)", async ({
  page,
  request,
}, testInfo) => {
  const row = unique("Rowing", testInfo.project.name);
  const rowId = await createExercise(request, row);
  await createWorkout(request, parisDate(-2), [
    {
      exerciseId: rowId,
      sets: [
        { weightKg: 80, reps: 6 },
        { weightKg: 80, reps: 6 },
        { weightKg: 80, reps: 5 },
      ],
    },
  ]);

  await page.goto("/saisie");
  const card = await addExercise(page, row);
  await expect(card.getByText(/^Prérempli depuis le /)).toBeVisible();
  await expect(card.getByRole("textbox", { name: "Charge (kg), série 3" })).toHaveValue("80");
  await card.getByRole("textbox", { name: "Répétitions, série 3" }).fill("6");
  await page.getByRole("button", { name: "Enregistrer la séance" }).click();
  await expect(page).toHaveURL(/\/seances\/[0-9a-f-]{36}$/);

  const id = page.url().split("/").at(-1)!;
  const workout = await getWorkout(request, id);
  expect(workout.exercises[0]?.sets.map((s) => [s.weightKg, s.reps])).toEqual([
    [80, 6],
    [80, 6],
    [80, 6],
  ]);
});

test("modifier puis supprimer une séance passée", async ({ page, request }, testInfo) => {
  const curl = unique("Curl", testInfo.project.name);
  const curlId = await createExercise(request, curl);
  const id = await createWorkout(request, parisDate(-3), [
    { exerciseId: curlId, sets: [{ weightKg: 12, reps: 10 }] },
  ]);

  await page.goto(`/seances/${id}`);
  const card = page.getByRole("region", { name: curl });
  await card.getByRole("textbox", { name: "Charge (kg), série 1" }).fill("14");
  await page.getByRole("button", { name: "Enregistrer la séance" }).click();
  await expect(page.getByRole("status")).toHaveText("Séance enregistrée.");
  await page.reload();
  await expect(card.getByRole("textbox", { name: "Charge (kg), série 1" })).toHaveValue("14");

  await page.getByRole("button", { name: "Supprimer la séance" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page).toHaveURL(/\/$/);
  expect((await request.get(`/api/v1/workouts/${id}`)).status()).toBe(404);
});
