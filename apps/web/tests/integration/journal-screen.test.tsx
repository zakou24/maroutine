// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { DayJournal } from "@maroutine/core";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JournalView } from "@/app/(app)/alimentation/journal-screen";
import { renderWithQuery } from "../helpers/render";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  apiFetch,
}));

const DATE = "2026-10-30";
const day: DayJournal = {
  date: DATE,
  entries: [
    {
      id: "e1",
      eatenOn: DATE,
      meal: "breakfast",
      foodId: "f1",
      label: "Skyr",
      quantityG: 150,
      kcal: 93,
      proteinG: 16.5,
    },
    {
      id: "e2",
      eatenOn: DATE,
      meal: "dinner",
      foodId: null,
      label: "Pizza",
      quantityG: null,
      kcal: 800,
      proteinG: 30,
    },
  ],
  totals: { kcal: 893, proteinG: 46.5 },
  target: { validFrom: "2026-10-01", kcal: 2400, proteinG: 150 },
};

function serve(journal: DayJournal, copied = 0) {
  apiFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
    if (path.startsWith("/api/v1/food-entries?date=")) return journal;
    if (path === "/api/v1/food-entries/copy") return { created: copied };
    if (init?.method === "PATCH" || init?.method === "DELETE") return undefined;
    throw new Error(path);
  });
}

beforeEach(() => {
  apiFetch.mockReset();
});
afterEach(cleanup);

describe("journal du jour (F-ALI-4)", () => {
  it("montre les totaux face aux objectifs et les entrées par repas", async () => {
    serve(day);
    renderWithQuery(<JournalView date={DATE} today="2026-10-31" onDateChange={() => {}} />);
    expect(await screen.findByText(/^893 \/ 2\s400 kcal$/)).toBeVisible();
    expect(screen.getByText("46,5 / 150 g de protéines")).toBeVisible();
    const breakfast = screen.getByRole("region", { name: "Petit-déjeuner" });
    expect(within(breakfast).getByText("Skyr")).toBeVisible();
    expect(within(breakfast).getByText("150 g · 93 kcal · 16,5 g de protéines")).toBeVisible();
    expect(
      within(breakfast).getByRole("link", { name: "Ajouter au petit-déjeuner" }),
    ).toHaveAttribute("href", `/alimentation/ajouter?date=${DATE}&meal=breakfast`);
    expect(within(screen.getByRole("region", { name: "Dîner" })).getByText("Pizza")).toBeVisible();
  });

  it("sans objectif, invite à en définir", async () => {
    serve({ ...day, target: null });
    renderWithQuery(<JournalView date={DATE} today="2026-10-31" onDateChange={() => {}} />);
    expect(await screen.findByText("Pas d'objectif pour ce jour.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Définir mes objectifs" })).toHaveAttribute(
      "href",
      "/objectifs",
    );
  });

  it("modifie la quantité d'une entrée et en supprime une", async () => {
    serve(day);
    renderWithQuery(<JournalView date={DATE} today="2026-10-31" onDateChange={() => {}} />);
    await userEvent.click(await screen.findByRole("button", { name: "Modifier Skyr" }));
    const field = screen.getByRole("textbox", { name: "Quantité (g)" });
    await userEvent.clear(field);
    await userEvent.type(field, "300");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/food-entries/e1", {
      method: "PATCH",
      body: { quantityG: 300 },
    });
    await userEvent.click(screen.getByRole("button", { name: "Supprimer Pizza" }));
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/food-entries/e2", { method: "DELETE" });
  });

  it("copier un jour vide le dit (F-ALI-7)", async () => {
    serve(day, 0);
    renderWithQuery(<JournalView date={DATE} today="2026-10-31" onDateChange={() => {}} />);
    await userEvent.click(await screen.findByRole("button", { name: "Copier" }));
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/food-entries/copy", {
      method: "POST",
      body: { fromDate: "2026-10-29", toDate: DATE },
    });
    expect(await screen.findByText("Rien à copier ce jour-là.")).toBeVisible();
  });
});
