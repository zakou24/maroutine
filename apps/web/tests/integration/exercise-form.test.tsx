// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
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

beforeEach(() => {
  apiFetch.mockReset();
  onSaved.mockReset();
  renderWithQuery(<ExerciseForm onSaved={onSaved} />);
});
afterEach(cleanup);

function increment() {
  return screen.getByLabelText("Pas d'augmentation (kg)");
}

describe("ExerciseForm", () => {
  it("propose le pas de la barre par défaut, en virgule", () => {
    expect(increment()).toHaveValue("2,5");
  });

  it("choisir Haltères propose un pas de 2 kg", async () => {
    await userEvent.selectOptions(screen.getByLabelText("Matériel"), "Haltères");
    expect(increment()).toHaveValue("2");
  });

  it("un pas modifié à la main n'est plus écrasé par le matériel", async () => {
    const user = userEvent.setup();
    await user.clear(increment());
    await user.type(increment(), "1,25");
    await user.selectOptions(screen.getByLabelText("Matériel"), "Machine");
    expect(increment()).toHaveValue("1,25");
  });

  it("« 1,25 » dans le pas est envoyé comme 1.25", async () => {
    const user = userEvent.setup();
    apiFetch.mockResolvedValue({ id: "1", name: "Curl" });
    await user.type(screen.getByLabelText("Nom"), "Curl");
    await user.clear(increment());
    await user.type(increment(), "1,25");
    await user.click(screen.getByRole("button", { name: "Créer l'exercice" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/exercises", {
      method: "POST",
      body: { name: "Curl", equipment: "barbell", repMin: 6, repMax: 10, incrementKg: 1.25 },
    });
  });

  it("affiche « Ce nom existe déjà. » sur un 409", async () => {
    const user = userEvent.setup();
    apiFetch.mockRejectedValue(new ApiError(409, "duplicate_name"));
    await user.type(screen.getByLabelText("Nom"), "Squat");
    await user.click(screen.getByRole("button", { name: "Créer l'exercice" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ce nom existe déjà.");
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("refuse une fourchette inversée sans appeler l'API", async () => {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Nom"), "Squat");
    await user.clear(screen.getByLabelText("Répétitions minimum"));
    await user.type(screen.getByLabelText("Répétitions minimum"), "12");
    await user.click(screen.getByRole("button", { name: "Créer l'exercice" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La fourchette doit aller d'un nombre au même ou à un plus grand.",
    );
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("refuse un pas qui n'est pas un multiple de 0,25 kg", async () => {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Nom"), "Squat");
    await user.clear(increment());
    await user.type(increment(), "1,3");
    await user.click(screen.getByRole("button", { name: "Créer l'exercice" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Le pas doit être un multiple de 0,25 kg.",
    );
  });
});
