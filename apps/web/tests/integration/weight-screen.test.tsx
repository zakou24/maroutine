// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { BodyWeight } from "@maroutine/core";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WeightView } from "@/app/(app)/poids/weight-screen";
import { renderWithQuery } from "../helpers/render";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  apiFetch,
}));
vi.mock("@/app/(app)/poids/weight-chart", () => ({
  WeightChart: () => <div data-testid="chart" />,
}));

const TODAY = "2026-10-31";

function serve(weighIns: BodyWeight[]) {
  apiFetch.mockImplementation(async (path: string, init?: { method?: string; body?: unknown }) => {
    if (path === "/api/v1/body-weights" && !init) return weighIns;
    if (init?.method === "PUT") return { date: path.split("/").at(-1), ...(init.body as object) };
    if (init?.method === "DELETE") return undefined;
    throw new Error(path);
  });
}

beforeEach(() => {
  apiFetch.mockReset();
});
afterEach(cleanup);

const three: BodyWeight[] = [
  { date: "2026-10-27", weightKg: 80 },
  { date: "2026-10-29", weightKg: 78 },
  { date: "2026-10-31", weightKg: 79 },
];

describe("écran Poids (F-POI-1, F-POI-2)", () => {
  it("montre la courbe, son résumé et la liste des pesées, la plus récente d'abord", async () => {
    serve(three);
    renderWithQuery(<WeightView today={TODAY} />);
    expect(
      await screen.findByText("3 pesées sur 3 mois. Moyenne sur 7 jours : 79,0 kg."),
    ).toBeVisible();
    expect(screen.getByTestId("chart")).toBeInTheDocument();
    const items = within(screen.getByRole("list", { name: "Pesées" })).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("79,0 kg");
  });

  it("sans moyenne possible, le dit", async () => {
    serve([{ date: "2026-10-31", weightKg: 79 }]);
    renderWithQuery(<WeightView today={TODAY} />);
    expect(
      await screen.findByText(
        "1 pesée sur 3 mois. Pas encore de moyenne sur 7 jours (3 pesées en 7 jours).",
      ),
    ).toBeVisible();
  });

  it("préremplit une date déjà pesée et propose de la remplacer", async () => {
    serve(three);
    renderWithQuery(<WeightView today={TODAY} />);
    expect(await screen.findByRole("textbox", { name: "Pesée (kg)" })).toHaveValue("79,0");
    expect(screen.getByRole("button", { name: "Remplacer" })).toBeVisible();
  });

  it("refuse plus d'une décimale sans appeler l'API (Review Focus 2)", async () => {
    serve([]);
    renderWithQuery(<WeightView today={TODAY} />);
    expect(await screen.findByText("Aucune pesée pour l'instant.")).toBeVisible();
    await userEvent.type(screen.getByRole("textbox", { name: "Pesée (kg)" }), "78,45");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(screen.getByText("La pesée prend une décimale au plus.")).toBeVisible();
    expect(apiFetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/body-weights/"),
      expect.anything(),
    );
  });

  it("enregistre « 78,4 » à la date choisie", async () => {
    serve([]);
    renderWithQuery(<WeightView today={TODAY} />);
    await userEvent.type(await screen.findByRole("textbox", { name: "Pesée (kg)" }), "78,4");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(apiFetch).toHaveBeenCalledWith(`/api/v1/body-weights/${TODAY}`, {
      method: "PUT",
      body: { weightKg: 78.4 },
    });
    expect(await screen.findByText("Pesée enregistrée.")).toBeVisible();
  });

  it("supprime une pesée", async () => {
    serve(three);
    renderWithQuery(<WeightView today={TODAY} />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Supprimer la pesée du 29 octobre" }),
    );
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/body-weights/2026-10-29", { method: "DELETE" });
  });
});
