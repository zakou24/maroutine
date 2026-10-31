// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type {
  Exercise,
  ExerciseStatsResponse,
  SessionStats,
  SuggestionResponse,
} from "@maroutine/core";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExerciseStats } from "@/app/(app)/exercices/[id]/exercise-stats";
import { renderWithQuery } from "../helpers/render";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  apiFetch,
}));
// Recharts mesure le DOM : la courbe elle-même est vérifiée en e2e.
vi.mock("@/app/(app)/exercices/[id]/progress-chart", () => ({
  ProgressChart: () => <div data-testid="chart" />,
}));

const squat: Exercise = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Squat",
  equipment: "barbell",
  repMin: 6,
  repMax: 10,
  incrementKg: 2.5,
  archived: false,
};

function session(
  i: number,
  max: number | null,
  bestSet = { weightKg: 100, reps: 5 },
): SessionStats {
  return {
    workoutId: `w${i}`,
    performedOn: `2026-10-${String(10 + i).padStart(2, "0")}`,
    estimatedMax: max,
    approximate: false,
    bestSet,
    volumeKg: max === null ? null : 1240,
    workingSetCount: 3,
  };
}

function serve(stats: ExerciseStatsResponse, suggestion: SuggestionResponse) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path.includes("/stats")) return stats;
    if (path.includes("/suggestion")) return suggestion;
    throw new Error(path);
  });
}

const sessions = [session(0, 116.7), session(1, 120), session(2, 128.3)];
const addRep: SuggestionResponse = {
  suggestion: { rule: "add-rep", weightKg: 110, reps: 6, done: { weightKg: 110, reps: 5 } },
  text: "Tu as fait 110 × 5 : vise 110 × 6.",
};

beforeEach(() => {
  apiFetch.mockReset();
});
afterEach(cleanup);

describe("ExerciseStats (fiche exercice)", () => {
  it("montre tendance, dernier max, suggestion, résumé de la courbe et historique", async () => {
    serve({ trend: "progressing", latest: sessions[2]!, sessions, corridor: [] }, addRep);
    renderWithQuery(<ExerciseStats exercise={squat} />);
    expect(await screen.findByText("En progression")).toBeVisible();
    expect(screen.getByText("Dernier max estimé : 128,3 kg")).toBeVisible();
    const next = screen.getByRole("region", { name: "Prochaine séance" });
    expect(within(next).getByText("110 kg × 6")).toBeVisible();
    expect(within(next).getByText("Tu as fait 110 × 5 : vise 110 × 6.")).toBeVisible();
    expect(screen.getByTestId("chart")).toBeInTheDocument();
    expect(screen.getByText("3 séances sur 3 mois, de 116,7 à 128,3 kg.")).toBeVisible();
    const rows = within(screen.getByRole("list", { name: "Historique" })).getAllByRole("link");
    expect(rows).toHaveLength(3);
    // La plus récente d'abord.
    expect(rows[0]).toHaveAttribute("href", "/seances/w2");
    expect(rows[0]).toHaveTextContent(/100 kg × 5 · max 128,3 kg · volume 1\s240 kg/);
  });

  it("change de période", async () => {
    serve({ trend: "progressing", latest: sessions[2]!, sessions, corridor: [] }, addRep);
    renderWithQuery(<ExerciseStats exercise={squat} />);
    await screen.findByText("En progression");
    expect(screen.getByRole("button", { name: "3 mois" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "1 mois" }));
    expect(screen.getByRole("button", { name: "1 mois" })).toHaveAttribute("aria-pressed", "true");
    expect(apiFetch).toHaveBeenCalledWith(`/api/v1/exercises/${squat.id}/stats?period=1m`);
    expect(await screen.findByText("3 séances sur 1 mois, de 116,7 à 128,3 kg.")).toBeVisible();
  });

  it("signale la régression en orange et renvoie vers l'historique (règle 2)", async () => {
    serve(
      { trend: "regressing", latest: sessions[2]!, sessions, corridor: [] },
      {
        suggestion: { rule: "declining", weightKg: 100, reps: 5 },
        text: "Ton max estimé baisse depuis 2 séances : garde la charge et regarde ta récupération et ton alimentation.",
      },
    );
    renderWithQuery(<ExerciseStats exercise={squat} />);
    expect(await screen.findByText("En régression")).toHaveClass("text-regression-ink");
    const next = screen.getByRole("region", { name: "Prochaine séance" });
    expect(next).toHaveClass("bg-regression-wash");
    expect(within(next).getByRole("link", { name: "Voir l'historique" })).toHaveAttribute(
      "href",
      "#historique",
    );
  });

  it("sans séance, l'invite à commencer", async () => {
    serve(
      { trend: "insufficient", latest: null, sessions: [], corridor: [] },
      { suggestion: { rule: "first" }, text: "Première fois : choisis une charge confortable." },
    );
    renderWithQuery(<ExerciseStats exercise={squat} />);
    expect(await screen.findByText("Pas encore de séance avec cet exercice.")).toBeVisible();
    expect(screen.getByText("Première fois : choisis une charge confortable.")).toBeVisible();
    expect(screen.queryByTestId("chart")).toBeNull();
  });

  it("au poids du corps sans pesée, pas de courbe mais la meilleure série", async () => {
    const dips = { ...squat, equipment: "bodyweight" as const, name: "Dips" };
    const bw = [session(0, null, { weightKg: 0, reps: 11 })];
    serve(
      { trend: "insufficient", latest: bw[0]!, sessions: bw, corridor: [] },
      {
        suggestion: { rule: "add-rep", weightKg: 0, reps: 12, done: { weightKg: 0, reps: 11 } },
        text: "x",
      },
    );
    renderWithQuery(<ExerciseStats exercise={dips} />);
    expect(
      await screen.findByText(
        "Le max estimé des exercices au poids du corps utilise ta pesée : il arrivera avec le suivi du poids.",
      ),
    ).toBeVisible();
    expect(screen.queryByTestId("chart")).toBeNull();
    expect(screen.getByText("Meilleure série : poids du corps × 11")).toBeVisible();
  });
});
