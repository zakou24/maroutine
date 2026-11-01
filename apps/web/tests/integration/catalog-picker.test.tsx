// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { Exercise } from "@maroutine/core";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogPicker } from "@/app/(app)/exercices/catalogue/catalog-picker";
import { renderWithQuery } from "../helpers/render";

const { apiFetch, push } = vi.hoisted(() => ({ apiFetch: vi.fn(), push: vi.fn() }));
vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  apiFetch,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const squat: Exercise = {
  id: "00000000-0000-4000-8000-00000000000a",
  name: "squat",
  equipment: "barbell",
  muscleGroup: "legs",
  repMin: 6,
  repMax: 10,
  incrementKg: 2.5,
  archived: false,
};

beforeEach(() => {
  apiFetch.mockReset();
  push.mockReset();
  apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith("/api/v1/exercises?filter=all")) return [squat];
    return { created: [], existing: [] };
  });
  renderWithQuery(<CatalogPicker />);
});
afterEach(cleanup);

describe("CatalogPicker (D16)", () => {
  it("range les bras en Biceps et Triceps (D27)", async () => {
    await screen.findByRole("checkbox", { name: "Squat (déjà ajouté)" });
    expect(screen.getByRole("group", { name: "Biceps" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Triceps" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Bras" })).toBeNull();
  });

  it("un exercice déjà créé apparaît coché et grisé, quelle que soit la casse", async () => {
    const box = await screen.findByRole("checkbox", { name: "Squat (déjà ajouté)" });
    expect(box).toBeChecked();
    expect(box).toBeDisabled();
  });

  it("la sélection de 3 exercices envoie un seul lot avec leur matériel", async () => {
    await screen.findByRole("checkbox", { name: "Squat (déjà ajouté)" });
    expect(screen.getByRole("button", { name: "Ajouter" })).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox", { name: "Dips" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Curl haltères" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Presse à cuisses" }));
    await userEvent.click(screen.getByRole("button", { name: "Ajouter (3)" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/exercices"));
    // L'écran reste monté (caché) après la navigation : la sélection repart de zéro.
    expect(screen.getByRole("button", { name: "Ajouter" })).toBeDisabled();
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/exercises/batch", {
      method: "POST",
      body: {
        exercises: [
          { name: "Dips", muscleGroup: "chest", equipment: "bodyweight" },
          { name: "Presse à cuisses", muscleGroup: "legs", equipment: "machine" },
          { name: "Curl haltères", muscleGroup: "biceps", equipment: "dumbbell" },
        ],
      },
    });
  });
});
