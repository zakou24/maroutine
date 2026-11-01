// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { Exercise } from "@maroutine/core";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkoutEditor } from "@/app/(app)/seances/workout-editor";
import { draftStorageKey, type WorkoutDraft } from "@/app/(app)/seances/workout-draft";
import { renderWithQuery } from "../helpers/render";

const { apiFetch, push } = vi.hoisted(() => ({ apiFetch: vi.fn(), push: vi.fn() }));
vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  apiFetch,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: push }) }));

const TODAY = "2026-10-31";
const KEY = draftStorageKey();
const DRAFT_ID = "33333333-3333-4333-8333-333333333333";
const squat: Exercise = {
  id: "00000000-0000-4000-8000-00000000000a",
  name: "Squat",
  equipment: "barbell",
  muscleGroup: "legs",
  repMin: 6,
  repMax: 10,
  incrementKg: 2.5,
  archived: false,
};
const dips: Exercise = {
  ...squat,
  id: "00000000-0000-4000-8000-00000000000d",
  name: "Dips",
  equipment: "bodyweight",
  muscleGroup: "legs",
};
const curl: Exercise = {
  ...squat,
  id: "00000000-0000-4000-8000-00000000000c",
  name: "Curl",
  archived: true,
};

// Brouillon écrit avant le Lot 1.1 : sans échauffement ni cardio, il doit rester lisible.
const stored: Omit<WorkoutDraft, "warmupDone" | "cardio"> = {
  id: DRAFT_ID,
  performedOn: TODAY,
  note: "",
  exercises: [
    {
      key: "e1",
      exerciseId: squat.id,
      name: "Squat",
      prefilledFrom: "2026-10-30",
      sets: [{ key: "s1", weight: "62,5", reps: "8", isWarmup: false }],
    },
  ],
};

function routeApi(
  overrides: (path: string, init?: { method?: string }) => unknown = () => undefined,
) {
  apiFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
    const value = overrides(path, init);
    if (value !== undefined) return value instanceof Error ? Promise.reject(value) : value;
    if (path.startsWith("/api/v1/exercises?filter=all")) return [squat, curl];
    if (path === "/api/v1/exercises/batch") return { created: [dips], existing: [] };
    if (path.includes("/last-sets")) return { performedOn: null, sets: [] };
    if (path.includes("/suggestion")) {
      return {
        suggestion: { rule: "first" },
        text: "Première fois : choisis une charge confortable.",
      };
    }
    throw new Error(`appel inattendu : ${path}`);
  });
}

function openEditor(initialDate = TODAY) {
  return renderWithQuery(<WorkoutEditor mode="create" initialDate={initialDate} />);
}

function dateField() {
  return screen.getByLabelText("Date de la séance");
}

beforeEach(() => {
  localStorage.clear();
  apiFetch.mockReset();
  push.mockReset();
});
afterEach(cleanup);

describe("WorkoutEditor", () => {
  it("restaure le brouillon enregistré quand on rouvre l'écran (Review Focus 4)", async () => {
    localStorage.setItem(KEY, JSON.stringify(stored));
    routeApi();
    openEditor();
    const card = await screen.findByRole("region", { name: "Squat" });
    expect(within(card).getByRole("textbox", { name: "Charge (kg), série 1" })).toHaveValue("62,5");
    expect(within(card).getByText("Prérempli depuis le 30 oct.")).toBeInTheDocument();
    expect(screen.getByText("Brouillon non enregistré restauré.")).toBeInTheDocument();
  });

  it("un brouillon commencé avant minuit est restauré après minuit, avec sa date (Review Focus 2 et 4)", async () => {
    localStorage.setItem(KEY, JSON.stringify(stored));
    routeApi();
    openEditor("2026-11-01");
    await screen.findByRole("region", { name: "Squat" });
    expect(dateField()).toHaveValue(TODAY);
  });

  it("une saisie vide restée ouverte prend la date du jour quand le jour change", async () => {
    routeApi();
    const view = openEditor();
    await screen.findByRole("button", { name: "Ajouter un exercice" });
    expect(dateField()).toHaveValue(TODAY);
    view.rerender(<WorkoutEditor mode="create" initialDate="2026-11-01" />);
    expect(dateField()).toHaveValue("2026-11-01");
  });

  it("un brouillon illisible est ignoré au lieu de bloquer l'écran", async () => {
    localStorage.setItem(KEY, JSON.stringify({ performedOn: TODAY, exercises: "cassé" }));
    routeApi();
    openEditor();
    expect(await screen.findByRole("button", { name: "Ajouter un exercice" })).toBeInTheDocument();
    expect(screen.queryByText("Brouillon non enregistré restauré.")).toBeNull();
  });

  it("chaque modification est gardée dans le brouillon", async () => {
    localStorage.setItem(KEY, JSON.stringify(stored));
    routeApi();
    openEditor();
    const reps = await screen.findByRole("textbox", { name: "Répétitions, série 1" });
    await userEvent.clear(reps);
    await userEvent.type(reps, "9");
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as WorkoutDraft;
    expect(saved.exercises[0]?.sets[0]?.reps).toBe("9");
  });

  it("sur une panne réseau à l'enregistrement : message « Enregistrement impossible. Réessaie. », brouillon conservé, bouton réactivé", async () => {
    localStorage.setItem(KEY, JSON.stringify(stored));
    routeApi((path, init) =>
      path === "/api/v1/workouts" && init?.method === "POST"
        ? new TypeError("Failed to fetch")
        : undefined,
    );
    openEditor();
    await screen.findByRole("region", { name: "Squat" });
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer la séance" }));
    expect(await screen.findByText("Enregistrement impossible. Réessaie.")).toBeInTheDocument();
    expect(localStorage.getItem(KEY)).not.toBeNull();
    expect(screen.getByRole("button", { name: "Enregistrer la séance" })).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
  });

  it("après un enregistrement réussi, le brouillon est effacé et l'écran ouvre la séance", async () => {
    localStorage.setItem(KEY, JSON.stringify(stored));
    routeApi((path, init) =>
      path === "/api/v1/workouts" && init?.method === "POST"
        ? { id: "w1", performedOn: TODAY, note: null, exercises: [] }
        : undefined,
    );
    openEditor();
    await screen.findByRole("region", { name: "Squat" });
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer la séance" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/seances/w1"));
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/workouts", {
      method: "POST",
      body: {
        id: DRAFT_ID,
        performedOn: TODAY,
        note: null,
        warmupDone: false,
        cardioMinutes: null,
        muscleGroups: [],
        exercises: [{ exerciseId: squat.id, sets: [{ weightKg: 62.5, reps: 8, isWarmup: false }] }],
      },
    });
  });

  it("signale la série invalide sans appeler l'API", async () => {
    localStorage.setItem(KEY, JSON.stringify(stored));
    routeApi();
    openEditor();
    const weight = await screen.findByRole("textbox", { name: "Charge (kg), série 1" });
    await userEvent.clear(weight);
    await userEvent.type(weight, "6,2,5");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer la séance" }));
    expect(await screen.findByText("Série 1 : charge invalide.")).toBeInTheDocument();
    expect(weight).toHaveAttribute("aria-invalid", "true");
    expect(apiFetch).not.toHaveBeenCalledWith("/api/v1/workouts", expect.anything());
  });

  it("le sélecteur ne propose pas les exercices archivés", async () => {
    routeApi();
    openEditor();
    await userEvent.click(await screen.findByRole("button", { name: "Ajouter un exercice" }));
    const picker = await screen.findByRole("list", { name: "Tes exercices" });
    expect(within(picker).getByRole("button", { name: "Squat" })).toBeInTheDocument();
    expect(within(picker).queryByRole("button", { name: "Curl" })).toBeNull();
  });

  it("échauffement et cardio 15 min sont envoyés avec la séance", async () => {
    localStorage.setItem(KEY, JSON.stringify(stored));
    routeApi((path, init) =>
      path === "/api/v1/workouts" && init?.method === "POST"
        ? { id: "w1", performedOn: TODAY, note: null, exercises: [] }
        : undefined,
    );
    openEditor();
    await screen.findByRole("region", { name: "Squat" });
    expect(screen.getByRole("checkbox", { name: "Échauffement fait" })).not.toBeChecked();
    await userEvent.click(screen.getByRole("checkbox", { name: "Échauffement fait" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Cardio" }));
    await userEvent.click(screen.getByRole("button", { name: "15 min" }));
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer la séance" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/seances/w1"));
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/workouts",
      expect.objectContaining({
        body: expect.objectContaining({ warmupDone: true, cardioMinutes: 15 }),
      }),
    );
  });

  it("cardio « Autre » à 0 : message et aucun envoi (Review Focus 2)", async () => {
    localStorage.setItem(KEY, JSON.stringify(stored));
    routeApi();
    openEditor();
    await screen.findByRole("region", { name: "Squat" });
    await userEvent.click(screen.getByRole("checkbox", { name: "Cardio" }));
    await userEvent.click(screen.getByRole("button", { name: "Autre" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Durée du cardio (min)" }), "0");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer la séance" }));
    expect(
      (await screen.findAllByText("Durée de cardio entre 1 et 180 minutes.")).length,
    ).toBeGreaterThan(0);
    expect(apiFetch).not.toHaveBeenCalledWith("/api/v1/workouts", expect.anything());
  });

  it("choisir un exercice du catalogue le crée puis l'ajoute à la séance (D16)", async () => {
    routeApi();
    openEditor();
    await userEvent.click(await screen.findByRole("button", { name: "Ajouter un exercice" }));
    const catalog = await screen.findByRole("region", { name: "Catalogue" });
    // Le catalogue est replié par groupe musculaire tant qu'on ne cherche pas.
    expect(within(catalog).queryByRole("button", { name: "Dips" })).toBeNull();
    await userEvent.click(within(catalog).getByRole("button", { name: /^Pectoraux/ }));
    await userEvent.click(within(catalog).getByRole("button", { name: "Dips" }));
    expect(await screen.findByRole("region", { name: "Dips" })).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/exercises/batch", {
      method: "POST",
      body: { exercises: [{ name: "Dips", equipment: "bodyweight" }] },
    });
  });

  it("la recherche filtre tes exercices et le catalogue ; un exercice déjà créé n'est pas reproposé", async () => {
    routeApi();
    openEditor();
    await userEvent.click(await screen.findByRole("button", { name: "Ajouter un exercice" }));
    await userEvent.type(
      await screen.findByRole("searchbox", { name: "Rechercher un exercice" }),
      "squ",
    );
    const mine = screen.getByRole("list", { name: "Tes exercices" });
    expect(
      within(mine)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Squat"]);
    const catalog = screen.getByRole("region", { name: "Catalogue" });
    expect(
      within(catalog)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Squat bulgare"]);
  });

  it("choisir un exercice le préremplit depuis la dernière séance avant la date, avec la suggestion (F-SEA-3)", async () => {
    routeApi((path) => {
      if (path.includes("/last-sets")) {
        return { performedOn: "2026-10-28", sets: [{ weightKg: 80, reps: 6, isWarmup: false }] };
      }
      if (path.includes("/suggestion")) {
        return {
          suggestion: { rule: "add-rep", weightKg: 80, reps: 7, done: { weightKg: 80, reps: 6 } },
          text: "Tu as fait 80 × 6 : vise 80 × 7.",
        };
      }
      return undefined;
    });
    openEditor();
    await userEvent.click(await screen.findByRole("button", { name: "Ajouter un exercice" }));
    await userEvent.click(
      within(await screen.findByRole("list", { name: "Tes exercices" })).getByRole("button", {
        name: "Squat",
      }),
    );
    const card = await screen.findByRole("region", { name: "Squat" });
    expect(within(card).getByRole("textbox", { name: "Charge (kg), série 1" })).toHaveValue("80");
    expect(apiFetch).toHaveBeenCalledWith(
      `/api/v1/exercises/${squat.id}/last-sets?before=${TODAY}`,
    );
    expect(await within(card).findByText("Suggestion : 80 kg × 7")).toBeVisible();
    expect(within(card).getByText("Tu as fait 80 × 6 : vise 80 × 7.")).toBeVisible();
    expect(apiFetch).toHaveBeenCalledWith(
      `/api/v1/exercises/${squat.id}/suggestion?before=${TODAY}`,
    );
  });
});

describe("WorkoutEditor, séance existante", () => {
  const WORKOUT_ID = "44444444-4444-4444-8444-444444444444";
  const legacy = {
    id: WORKOUT_ID,
    performedOn: "2026-10-20",
    note: null,
    warmupDone: false,
    cardioMinutes: 25,
    exercises: [
      {
        exerciseId: squat.id,
        name: "Squat",
        archived: false,
        sets: [
          { weightKg: 40, reps: 10, isWarmup: true },
          { weightKg: 80, reps: 6, isWarmup: false },
        ],
      },
    ],
  };

  function openEdit() {
    return renderWithQuery(<WorkoutEditor mode="edit" workoutId={WORKOUT_ID} />);
  }

  it("garde une ancienne série d'échauffement à l'enregistrement, et ajoute une série de travail (Review Focus 1)", async () => {
    routeApi((path, init) => {
      if (path === `/api/v1/workouts/${WORKOUT_ID}` && init?.method === "PUT") return legacy;
      if (path === `/api/v1/workouts/${WORKOUT_ID}`) return legacy;
      return undefined;
    });
    openEdit();
    const card = await screen.findByRole("region", { name: "Squat" });
    expect(
      within(card).getByText("Série 1 : échauffement d'une ancienne saisie, hors stats."),
    ).toBeInTheDocument();
    await userEvent.click(within(card).getByRole("button", { name: "Ajouter une série" }));
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer la séance" }));
    await screen.findByText("Séance enregistrée.");
    const put = apiFetch.mock.calls.find(([, init]) => init?.method === "PUT")!;
    const body = put[1].body as { exercises: { sets: { isWarmup: boolean }[] }[] };
    expect(body.exercises[0]!.sets.map((s) => s.isWarmup)).toEqual([true, false, false]);
  });

  it("une durée de cardio hors des choix rapides reste visible après « Annuler les modifications »", async () => {
    routeApi((path) => (path === `/api/v1/workouts/${WORKOUT_ID}` ? legacy : undefined));
    const edited = {
      id: WORKOUT_ID,
      performedOn: "2026-10-20",
      note: "",
      warmupDone: false,
      cardio: "15",
      exercises: [],
    };
    localStorage.setItem(draftStorageKey(WORKOUT_ID), JSON.stringify(edited));
    openEdit();
    await userEvent.click(await screen.findByRole("button", { name: "Annuler les modifications" }));
    expect(screen.getByRole("textbox", { name: "Durée du cardio (min)" })).toHaveValue("25");
    expect(screen.getByRole("button", { name: "Autre" })).toHaveAttribute("aria-pressed", "true");
  });
});
