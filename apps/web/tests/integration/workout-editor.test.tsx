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
const KEY = draftStorageKey(TODAY);
const squat: Exercise = {
  id: "00000000-0000-4000-8000-00000000000a",
  name: "Squat",
  equipment: "barbell",
  repMin: 6,
  repMax: 10,
  incrementKg: 2.5,
  archived: false,
};
const curl: Exercise = {
  ...squat,
  id: "00000000-0000-4000-8000-00000000000c",
  name: "Curl",
  archived: true,
};

const stored: WorkoutDraft = {
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
    if (path.includes("/last-sets")) return { performedOn: null, sets: [] };
    throw new Error(`appel inattendu : ${path}`);
  });
}

function openEditor() {
  renderWithQuery(<WorkoutEditor mode="create" initialDate={TODAY} />);
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
        performedOn: TODAY,
        note: null,
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
    const picker = await screen.findByRole("list", { name: "Exercices disponibles" });
    expect(within(picker).getByRole("button", { name: "Squat" })).toBeInTheDocument();
    expect(within(picker).queryByRole("button", { name: "Curl" })).toBeNull();
  });

  it("choisir un exercice le préremplit depuis la dernière séance avant la date", async () => {
    routeApi((path) =>
      path.includes("/last-sets")
        ? { performedOn: "2026-10-28", sets: [{ weightKg: 80, reps: 6, isWarmup: false }] }
        : undefined,
    );
    openEditor();
    await userEvent.click(await screen.findByRole("button", { name: "Ajouter un exercice" }));
    await userEvent.click(await screen.findByRole("button", { name: "Squat" }));
    const card = await screen.findByRole("region", { name: "Squat" });
    expect(within(card).getByRole("textbox", { name: "Charge (kg), série 1" })).toHaveValue("80");
    expect(apiFetch).toHaveBeenCalledWith(
      `/api/v1/exercises/${squat.id}/last-sets?before=${TODAY}`,
    );
  });
});
