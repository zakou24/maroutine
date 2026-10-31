// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { Exercise } from "@maroutine/core";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExerciseForm } from "@/app/(app)/exercices/exercise-form";
import { renderWithQuery } from "../helpers/render";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  apiFetch,
}));

const { ApiError } = await import("@/lib/api");
const onSaved = vi.fn();

const curl: Exercise = {
  id: "00000000-0000-4000-8000-00000000000c",
  name: "Curl",
  equipment: "dumbbell",
  repMin: 8,
  repMax: 12,
  incrementKg: 2,
  archived: false,
};

beforeEach(() => {
  apiFetch.mockReset();
  onSaved.mockReset();
});
afterEach(cleanup);

function increment() {
  return screen.getByRole("textbox", { name: "Pas d'augmentation (kg)" });
}

describe("ExerciseForm, création", () => {
  beforeEach(() => {
    renderWithQuery(<ExerciseForm onSaved={onSaved} />);
  });

  it("ne demande pas le pas d'augmentation : il suit le matériel", async () => {
    expect(screen.queryByRole("textbox", { name: "Pas d'augmentation (kg)" })).toBeNull();
    apiFetch.mockResolvedValue({ ...curl, name: "Rowing" });
    await userEvent.type(screen.getByLabelText("Nom"), "Rowing");
    await userEvent.selectOptions(screen.getByLabelText("Matériel"), "Haltères");
    await userEvent.click(screen.getByRole("button", { name: "Créer l'exercice" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/exercises", {
      method: "POST",
      body: { name: "Rowing", equipment: "dumbbell", repMin: 6, repMax: 10 },
    });
  });

  it("affiche « Ce nom existe déjà. » sur un 409", async () => {
    apiFetch.mockRejectedValue(new ApiError(409, "duplicate_name"));
    await userEvent.type(screen.getByLabelText("Nom"), "Squat");
    await userEvent.click(screen.getByRole("button", { name: "Créer l'exercice" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ce nom existe déjà.");
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("refuse une fourchette inversée sans appeler l'API", async () => {
    await userEvent.type(screen.getByLabelText("Nom"), "Squat");
    await userEvent.clear(screen.getByLabelText("Répétitions minimum"));
    await userEvent.type(screen.getByLabelText("Répétitions minimum"), "12");
    await userEvent.click(screen.getByRole("button", { name: "Créer l'exercice" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La fourchette doit aller d'un nombre au même ou à un plus grand.",
    );
    expect(apiFetch).not.toHaveBeenCalled();
  });
});

describe("ExerciseForm, réglages d'un exercice", () => {
  beforeEach(() => {
    renderWithQuery(<ExerciseForm initial={curl} onSaved={onSaved} />);
  });

  it("montre le pas avec son explication", () => {
    expect(increment()).toHaveValue("2");
    expect(
      screen.getByText(
        "De combien monter la charge quand tu progresses. Sert aux suggestions de charge.",
      ),
    ).toBeInTheDocument();
  });

  it("« 1,25 » dans le pas est envoyé comme 1.25", async () => {
    apiFetch.mockResolvedValue(curl);
    await userEvent.clear(increment());
    await userEvent.type(increment(), "1,25");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(apiFetch).toHaveBeenCalledWith(`/api/v1/exercises/${curl.id}`, {
      method: "PATCH",
      body: { name: "Curl", equipment: "dumbbell", repMin: 8, repMax: 12, incrementKg: 1.25 },
    });
  });

  it("refuse un pas qui n'est pas un multiple de 0,25 kg", async () => {
    await userEvent.clear(increment());
    await userEvent.type(increment(), "1,3");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Le pas doit être un multiple de 0,25 kg.",
    );
  });

  it("changer de matériel ne remplace pas un pas déjà réglé", async () => {
    await userEvent.selectOptions(screen.getByLabelText("Matériel"), "Machine");
    expect(increment()).toHaveValue("2");
  });
});
