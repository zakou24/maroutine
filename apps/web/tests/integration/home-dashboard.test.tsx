// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type {
  Exercise,
  ExerciseTrendSummary,
  NextSuggestions,
  NutritionDay,
} from "@maroutine/core";
import { cleanup, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeNext } from "@/app/(app)/home-next";
import { HomeNutrition } from "@/app/(app)/home-nutrition";
import { HomeTrends } from "@/app/(app)/home-trends";
import { HomeWeight } from "@/app/(app)/home-weight";
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

function serve(routes: Record<string, unknown>) {
  apiFetch.mockImplementation(async (path: string) => {
    for (const [prefix, value] of Object.entries(routes)) {
      if (path.startsWith(prefix)) {
        if (value instanceof Error) throw value;
        return value;
      }
    }
    throw new Error(`appel inattendu : ${path}`);
  });
}

const target = { kcal: 2400, proteinG: 150 };
function day(date: string, status: NutritionDay["status"]): NutritionDay {
  return {
    date,
    kcal: 0,
    proteinG: 0,
    entryCount: status === "unrecorded" ? 0 : 3,
    target,
    status,
  };
}

describe("HomeNutrition (F-TDB-1)", () => {
  const week = [
    day("2026-10-26", "engaged"),
    day("2026-10-27", "notEngaged"),
    day("2026-10-28", "engaged"),
    day("2026-10-29", "unrecorded"),
    day("2026-10-30", "engaged"),
    // Repas noté à l'avance pour samedi : il ne compte pas avant le jour venu.
    day("2026-10-31", "engaged"),
    day("2026-11-01", "unrecorded"),
  ];

  it("compte les jours engagés parmi les jours renseignés, jusqu'à aujourd'hui", async () => {
    serve({ "/api/v1/nutrition/days?from=2026-10-26&to=2026-11-01": week });
    renderWithQuery(<HomeNutrition start="2026-10-26" today="2026-10-30" />);
    expect(await screen.findByText("3 jours engagés sur 4 renseignés")).toBeInTheDocument();
  });

  it("nomme chaque pastille, et marque les jours à venir", async () => {
    serve({ "/api/v1/nutrition/days": week });
    renderWithQuery(<HomeNutrition start="2026-10-26" today="2026-10-30" />);
    const days = await screen.findByRole("list", { name: "Jours de la semaine" });
    const links = within(days).getAllByRole("link");
    expect(links[0]).toHaveTextContent("lundi 26 octobre : engagé");
    expect(links[1]).toHaveTextContent("mardi 27 octobre : non engagé");
    expect(links[3]).toHaveTextContent("jeudi 29 octobre : non renseigné");
    expect(links[0]).toHaveAttribute("href", "/alimentation?date=2026-10-26");
    expect(screen.getByText("samedi 31 octobre : à venir")).toBeInTheDocument();
  });

  it("sans objectif, invite à en fixer un", async () => {
    serve({
      "/api/v1/nutrition/days": week.map((d) => ({
        ...d,
        target: null,
        status: d.status === "unrecorded" ? "unrecorded" : "unrated",
      })),
    });
    renderWithQuery(<HomeNutrition start="2026-10-26" today="2026-10-30" />);
    expect(
      await screen.findByText("Fixe tes objectifs pour voir tes jours engagés."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Objectifs" })).toHaveAttribute("href", "/objectifs");
  });
});

function exercise(id: string, name: string): Exercise {
  return {
    id,
    name,
    muscleGroup: "legs",
    equipment: "barbell",
    repMin: 6,
    repMax: 10,
    incrementKg: 2.5,
    archived: false,
  };
}
const trend = (exerciseId: string, t: ExerciseTrendSummary["trend"]): ExerciseTrendSummary => ({
  exerciseId,
  trend: t,
  latestMax: 100,
  approximate: false,
});

describe("HomeTrends (F-TDB-1)", () => {
  it("regroupe par tendance, la régression vers la fiche, sans inactifs ni données insuffisantes", async () => {
    serve({
      "/api/v1/exercises/trends": [
        trend("a", "progressing"),
        trend("b", "regressing"),
        trend("c", "stalling"),
        trend("d", "inactive"),
        trend("e", "insufficient"),
        trend("f", "progressing"),
      ],
      "/api/v1/exercises?filter=active": [
        exercise("a", "Squat"),
        exercise("b", "Développé couché"),
        exercise("c", "Rowing"),
        exercise("d", "Curl"),
        exercise("e", "Dips"),
        exercise("f", "Presse"),
      ],
    });
    renderWithQuery(<HomeTrends />);
    const up = await screen.findByRole("list", { name: "En progression" });
    expect(
      within(up)
        .getAllByRole("link")
        .map((l) => l.textContent),
    ).toEqual(["Presse", "Squat"]);
    const down = screen.getByRole("list", { name: "En régression" });
    expect(within(down).getByRole("link", { name: "Développé couché" })).toHaveAttribute(
      "href",
      "/exercices/b",
    );
    expect(screen.getByRole("list", { name: "En stagnation" })).toHaveTextContent("Rowing");
    expect(screen.queryByText("Curl")).toBeNull();
    expect(screen.queryByText("Dips")).toBeNull();
  });
});

describe("HomeNext (F-TDB-1)", () => {
  it("liste les suggestions de la dernière séance, dans son ordre", async () => {
    const next: NextSuggestions = {
      workoutId: "w",
      performedOn: "2026-10-28",
      items: [
        {
          exerciseId: "b",
          name: "Développé couché",
          equipment: "barbell",
          suggestion: { rule: "add-rep", weightKg: 60, reps: 9 },
          text: "Tu as fait 60 × 8 : vise 60 × 9.",
        },
        {
          exerciseId: "a",
          name: "Squat",
          equipment: "barbell",
          suggestion: { rule: "first" },
          text: "Première fois : choisis une charge confortable.",
        },
      ] as NextSuggestions["items"],
    };
    serve({ "/api/v1/stats/next": next });
    renderWithQuery(<HomeNext />);
    expect(await screen.findByText("D'après ta séance du 28 octobre")).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Suggestions" });
    const links = within(list).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/exercices/b", "/exercices/a"]);
    expect(links[0]).toHaveTextContent("Tu as fait 60 × 8 : vise 60 × 9.");
  });

  it("un échec ne casse rien : message et nouvel essai", async () => {
    serve({ "/api/v1/stats/next": new Error("réseau") });
    renderWithQuery(<HomeNext />);
    expect(await screen.findByText("Impossible de charger les suggestions.")).toBeInTheDocument();
  });
});

describe("HomeWeight, tendance (F-TDB-1)", () => {
  const w = (date: string, weightKg: number) => ({ date, weightKg });

  it("affiche la variation de la moyenne sur 7 jours", async () => {
    serve({
      "/api/v1/body-weights": [
        w("2026-10-18", 80),
        w("2026-10-19", 80),
        w("2026-10-20", 80),
        w("2026-10-25", 79.6),
        w("2026-10-26", 79.6),
        w("2026-10-27", 79.6),
      ],
    });
    renderWithQuery(<HomeWeight today="2026-10-27" />);
    expect(await screen.findByText("Tendance : −0,4 kg en 7 jours")).toBeInTheDocument();
  });

  it("rien sans moyenne il y a 7 jours", async () => {
    serve({ "/api/v1/body-weights": [w("2026-10-26", 79.6), w("2026-10-27", 79.6)] });
    renderWithQuery(<HomeWeight today="2026-10-27" />);
    await screen.findByText(/79,6 kg, le/);
    expect(screen.queryByText(/^Tendance/)).toBeNull();
  });
});
