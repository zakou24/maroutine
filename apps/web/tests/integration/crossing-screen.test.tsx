// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { Crossing, CrossingResponse } from "@maroutine/core";
import { cleanup, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrossingScreen } from "@/app/(app)/croisement/crossing-screen";
import { renderWithQuery } from "../helpers/render";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  apiFetch,
}));

beforeEach(() => {
  apiFetch.mockReset();
});
afterEach(cleanup);

const enough: Crossing = {
  enough: true,
  engaged: { mean: 0.0183, progressions: 20, sessions: 12, missing: 0 },
  notEngaged: { mean: -0.004, progressions: 9, sessions: 7, missing: 0 },
};
const short: Crossing = {
  enough: false,
  engaged: { mean: null, progressions: 4, sessions: 3, missing: 2 },
  notEngaged: { mean: null, progressions: 0, sessions: 0, missing: 5 },
};

function serve(body: CrossingResponse) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path === "/api/v1/stats/crossing") return body;
    throw new Error(path);
  });
}

describe("CrossingScreen (F-TDB-3)", () => {
  it("au-dessus du seuil : la phrase, puis les deux groupes avec leurs comptes", async () => {
    serve({ all: enough, byExercise: [] });
    renderWithQuery(<CrossingScreen />);
    expect(
      await screen.findByText(
        "Après 3 jours bien suivis, ton max estimé a progressé en moyenne de +1,8 % (12 séances), contre −0,4 % sinon (7 séances).",
      ),
    ).toBeInTheDocument();
    const engaged = screen.getByRole("group", { name: "Après 3 jours bien suivis" });
    expect(engaged).toHaveTextContent("+1,8 %");
    expect(engaged).toHaveTextContent("20 progressions · 12 séances");
    const other = screen.getByRole("group", { name: "Sinon" });
    expect(other).toHaveTextContent("−0,4 %");
    expect(other).toHaveTextContent("9 progressions · 7 séances");
  });

  it("met en garde : une comparaison, pas une explication", async () => {
    serve({ all: enough, byExercise: [] });
    renderWithQuery(<CrossingScreen />);
    expect(
      await screen.findByText(/Une comparaison de moyennes, pas une explication/),
    ).toBeInTheDocument();
  });
});

describe("CrossingScreen, sous le seuil (F-TDB-4)", () => {
  it("dit ce qui manque, sans aucun pourcentage (Review Focus 3)", async () => {
    serve({ all: short, byExercise: [{ exerciseId: "a", name: "Squat", crossing: short }] });
    renderWithQuery(<CrossingScreen />);
    expect(
      await screen.findAllByText(
        "Pas encore assez de données : il manque 2 séances après des jours bien suivis et 5 après les autres.",
      ),
    ).toHaveLength(2);
    // Les résultats ne portent aucun pourcentage ; seule l'explication du calcul cite 90 % et 10 %.
    expect(screen.getByRole("region", { name: "Tous exercices" }).textContent).not.toMatch(/\d %/);
    expect(screen.getByRole("list", { name: "Par exercice" }).textContent).not.toMatch(/\d %/);
    expect(screen.queryByRole("group", { name: "Sinon" })).toBeNull();
  });
});

describe("CrossingScreen, par exercice", () => {
  it("donne la phrase de chaque exercice", async () => {
    serve({
      all: enough,
      byExercise: [
        { exerciseId: "a", name: "Squat", crossing: enough },
        { exerciseId: "b", name: "Développé couché", crossing: short },
      ],
    });
    renderWithQuery(<CrossingScreen />);
    const list = await screen.findByRole("list", { name: "Par exercice" });
    const items = within(list).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Squat");
    expect(items[0]).toHaveTextContent("+1,8 %");
    expect(items[1]).toHaveTextContent("Développé couché");
    expect(items[1]).toHaveTextContent("Pas encore assez de données");
    expect(within(items[0]!).getByRole("link", { name: "Squat" })).toHaveAttribute(
      "href",
      "/exercices/a",
    );
  });
});
