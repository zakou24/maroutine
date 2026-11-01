// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { Food, FoodSearchResponse } from "@maroutine/core";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddEntry } from "@/app/(app)/alimentation/ajouter/add-entry";
import { renderWithQuery } from "../helpers/render";

const { apiFetch, push } = vi.hoisted(() => ({ apiFetch: vi.fn(), push: vi.fn() }));
vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  apiFetch,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: push }) }));

const skyr: Food = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Skyr",
  brand: "Isey",
  kcalPer100g: 62,
  proteinPer100g: 11,
  source: "off",
};
const avoine: Food = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Avoine",
  brand: null,
  kcalPer100g: 370,
  proteinPer100g: 13,
  source: "custom",
};

function serve(
  search: FoodSearchResponse = { results: [{ ...skyr, recent: false }], offUnavailable: false },
) {
  apiFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
    if (path === "/api/v1/foods/recent") return [avoine];
    if (path.startsWith("/api/v1/foods/search")) return search;
    if (path === "/api/v1/food-entries" && init?.method === "POST") return {};
    throw new Error(path);
  });
}
const searches = () =>
  apiFetch.mock.calls.filter(([p]) => String(p).startsWith("/api/v1/foods/search"));

beforeEach(() => {
  apiFetch.mockReset();
  push.mockReset();
});
afterEach(cleanup);

describe("ajout d'une entrée (F-ALI-1, F-ALI-3, F-ALI-6)", () => {
  it("propose les récents quand le champ est vide", async () => {
    serve();
    renderWithQuery(<AddEntry date="2026-10-30" meal="breakfast" />);
    const recents = await screen.findByRole("list", { name: "Récents" });
    expect(within(recents).getByRole("button", { name: /Avoine/ })).toBeVisible();
  });

  it("temporise la recherche : un seul appel, et aucun sous 2 caractères", async () => {
    serve();
    renderWithQuery(<AddEntry date="2026-10-30" meal="breakfast" />);
    const field = screen.getByRole("searchbox", { name: "Rechercher un aliment" });
    await userEvent.type(field, "s");
    await new Promise((r) => setTimeout(r, 600));
    expect(searches()).toHaveLength(0);
    await userEvent.type(field, "kyr");
    await waitFor(() => expect(searches()).toHaveLength(1));
    expect(searches()[0]![0]).toBe("/api/v1/foods/search?q=skyr");
    expect(await screen.findByRole("link", { name: "Open Food Facts" })).toBeVisible();
    expect(screen.getByText(/licence ODbL/)).toBeVisible();
  });

  it("choisit un aliment, montre l'aperçu et l'ajoute au repas", async () => {
    serve();
    renderWithQuery(<AddEntry date="2026-10-30" meal="breakfast" />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Rechercher un aliment" }), "skyr");
    await userEvent.click(await screen.findByRole("button", { name: /Skyr/ }));
    const quantity = screen.getByRole("textbox", { name: "Quantité (g)" });
    await userEvent.clear(quantity);
    await userEvent.type(quantity, "150");
    expect(screen.getByText("93 kcal · 16,5 g de protéines")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Ajouter au petit-déjeuner" }));
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/food-entries", {
      method: "POST",
      body: { eatenOn: "2026-10-30", meal: "breakfast", foodId: skyr.id, quantityG: 150 },
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/alimentation?date=2026-10-30"));
  });

  it("ajout rapide sans libellé : un message, rien n'est envoyé", async () => {
    serve();
    renderWithQuery(<AddEntry date="2026-10-30" meal="snack" />);
    await userEvent.click(screen.getByRole("button", { name: "Ajout rapide" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Calories (kcal)" }), "300");
    await userEvent.click(screen.getByRole("button", { name: "Ajouter à la collation" }));
    expect(screen.getByText("Donne un libellé.")).toBeVisible();
    expect(apiFetch).not.toHaveBeenCalledWith("/api/v1/food-entries", expect.anything());
  });

  it("prévient quand Open Food Facts ne répond pas", async () => {
    serve({ results: [], offUnavailable: true });
    renderWithQuery(<AddEntry date="2026-10-30" meal="lunch" />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Rechercher un aliment" }), "skyr");
    expect(
      await screen.findByText("Open Food Facts ne répond pas : seuls tes aliments sont affichés."),
    ).toBeVisible();
  });
});
