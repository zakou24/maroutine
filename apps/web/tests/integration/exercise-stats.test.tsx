// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  periodStart,
  todayIn,
  type Exercise,
  type ExerciseStatsResponse,
  type NutritionDay,
  type SessionStats,
  type SuggestionResponse,
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
  muscleGroup: "legs",
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

function serve(
  stats: ExerciseStatsResponse,
  suggestion: SuggestionResponse,
  days: NutritionDay[] = [],
) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path.includes("/nutrition/days")) return days;
    if (path === "/api/v1/body-weights") return [];
    if (path.includes("/stats")) return stats;
    if (path.includes("/suggestion")) return suggestion;
    throw new Error(path);
  });
}

const target = { kcal: 2400, proteinG: 150 };
function nutritionDay(
  date: string,
  kcal: number,
  proteinG: number,
  status: NutritionDay["status"],
) {
  return { date, kcal, proteinG, entryCount: kcal > 0 ? 3 : 0, target, status };
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
    serve(
      {
        trend: "progressing",
        latest: sessions[2]!,
        lastMaxOn: "2026-10-12",
        sessions,
        corridor: [],
      },
      addRep,
    );
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
    serve(
      {
        trend: "progressing",
        latest: sessions[2]!,
        lastMaxOn: "2026-10-12",
        sessions,
        corridor: [],
      },
      addRep,
    );
    renderWithQuery(<ExerciseStats exercise={squat} />);
    await screen.findByText("En progression");
    expect(screen.getByRole("button", { name: "3 mois" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "1 mois" }));
    expect(screen.getByRole("button", { name: "1 mois" })).toHaveAttribute("aria-pressed", "true");
    expect(apiFetch).toHaveBeenCalledWith(`/api/v1/exercises/${squat.id}/stats?period=1m`);
    expect(await screen.findByText("3 séances sur 1 mois, de 116,7 à 128,3 kg.")).toBeVisible();
  });

  it("signale la régression en orange et renvoie au poids et à l'alimentation (règle 2, D20)", async () => {
    serve(
      {
        trend: "regressing",
        latest: sessions[2]!,
        lastMaxOn: "2026-10-12",
        sessions,
        corridor: [],
      },
      {
        suggestion: { rule: "declining", weightKg: 100, reps: 5 },
        text: "Ton max estimé baisse depuis 2 séances : garde la charge et regarde ta récupération et ton alimentation.",
      },
      [
        nutritionDay("2026-10-09", 2400, 150, "engaged"),
        nutritionDay("2026-10-10", 1500, 80, "notEngaged"),
        nutritionDay("2026-10-11", 0, 0, "unrecorded"),
      ],
    );
    renderWithQuery(<ExerciseStats exercise={squat} />);
    expect(await screen.findByText("En régression")).toHaveClass("text-regression-ink");
    const next = screen.getByRole("region", { name: "Prochaine séance" });
    expect(next).toHaveClass("bg-regression-wash");
    // Identifiant propre à la fiche : Next.js garde les fiches déjà vues montées et cachées.
    const href = within(next)
      .getByRole("link", { name: "Voir le poids et l'alimentation" })
      .getAttribute("href")!;
    const heading = document.getElementById(href.slice(1));
    expect(heading?.tagName).toBe("H2");
    expect(heading).toHaveTextContent("Autour de la baisse");
  });

  it("encart de régression : les 3 jours avant la dernière séance, nommés, avec leurs liens (F-TDB-5)", async () => {
    serve(
      {
        trend: "regressing",
        latest: sessions[2]!,
        lastMaxOn: "2026-10-12",
        sessions,
        corridor: [],
      },
      addRep,
      [
        nutritionDay("2026-10-09", 2400, 150, "engaged"),
        nutritionDay("2026-10-10", 1500, 80, "notEngaged"),
        nutritionDay("2026-10-11", 0, 0, "unrecorded"),
      ],
    );
    renderWithQuery(<ExerciseStats exercise={squat} />);
    const panel = await screen.findByRole("region", { name: "Autour de la baisse" });
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/nutrition/days?from=2026-10-09&to=2026-10-11");
    const days = await within(panel).findAllByRole("listitem");
    expect(days.map((d) => d.textContent)).toEqual([
      expect.stringMatching(/^vendredi 9 octobre.*Engagé/),
      expect.stringMatching(/^samedi 10 octobre.*Non engagé/),
      expect.stringMatching(/^dimanche 11 octobre.*Non renseigné/),
    ]);
    expect(within(days[0]!).getByRole("link")).toHaveAttribute(
      "href",
      "/alimentation?date=2026-10-09",
    );
    expect(within(panel).getByRole("link", { name: /Poids/ })).toHaveAttribute("href", "/poids");
  });

  it("l'encart garde la dernière séance avec un max, même hors de la période affichée (revue du Lot 5)", async () => {
    serve(
      {
        trend: "regressing",
        latest: sessions[2]!,
        lastMaxOn: "2026-10-12",
        sessions: [],
        corridor: [],
      },
      addRep,
    );
    renderWithQuery(<ExerciseStats exercise={squat} />);
    expect(await screen.findByRole("region", { name: "Autour de la baisse" })).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/nutrition/days?from=2026-10-09&to=2026-10-11");
  });

  it("pas d'encart ni de requête alimentaire hors régression", async () => {
    serve(
      {
        trend: "progressing",
        latest: sessions[2]!,
        lastMaxOn: "2026-10-12",
        sessions,
        corridor: [],
      },
      addRep,
    );
    renderWithQuery(<ExerciseStats exercise={squat} />);
    await screen.findByText("En progression");
    expect(screen.queryByRole("region", { name: "Autour de la baisse" })).toBeNull();
    expect(apiFetch).not.toHaveBeenCalledWith(expect.stringContaining("/nutrition/days"));
  });

  it("superpose les protéines à la courbe, avec leur moyenne sur la période (F-TDB-2)", async () => {
    serve(
      {
        trend: "progressing",
        latest: sessions[2]!,
        lastMaxOn: "2026-10-12",
        sessions,
        corridor: [],
      },
      addRep,
      [
        nutritionDay("2026-10-11", 2400, 150, "engaged"),
        nutritionDay("2026-10-12", 0, 0, "unrecorded"),
        nutritionDay("2026-10-13", 2200, 154, "engaged"),
      ],
    );
    renderWithQuery(<ExerciseStats exercise={squat} />);
    const overlay = await screen.findByRole("group", { name: "Superposer" });
    expect(within(overlay).getByRole("button", { name: "Rien" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(within(overlay).getByRole("button", { name: "Protéines" }));
    const today = todayIn("Europe/Paris", new Date());
    expect(apiFetch).toHaveBeenCalledWith(
      `/api/v1/nutrition/days?from=${periodStart(today, "3m")}&to=${today}`,
    );
    expect(
      await screen.findByText("152 g de protéines par jour en moyenne sur 2 jours renseignés."),
    ).toBeInTheDocument();
  });

  it("sans séance, l'invite à commencer", async () => {
    serve(
      { trend: "insufficient", latest: null, lastMaxOn: null, sessions: [], corridor: [] },
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
      { trend: "insufficient", latest: bw[0]!, lastMaxOn: null, sessions: bw, corridor: [] },
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
