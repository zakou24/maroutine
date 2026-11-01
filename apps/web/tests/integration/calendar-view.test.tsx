// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { WorkoutSummary } from "@maroutine/core";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarView } from "@/app/(app)/calendrier/calendar-view";
import { renderWithQuery } from "../helpers/render";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  apiFetch,
}));

function summary(id: string, performedOn: string): WorkoutSummary {
  return {
    id,
    performedOn,
    exerciseCount: 3,
    workingSetCount: 9,
    warmupDone: false,
    cardioMinutes: null,
    muscleGroups: [],
  };
}

function serve(workouts: WorkoutSummary[]) {
  apiFetch.mockImplementation(async (path: string) => {
    const query = new URL(path, "http://x").searchParams;
    const from = query.get("from")!;
    const to = query.get("to")!;
    return workouts.filter((w) => w.performedOn >= from && w.performedOn <= to);
  });
}

beforeEach(() => apiFetch.mockReset());
afterEach(cleanup);

describe("CalendarView", () => {
  it("marque les jours de séance et compte les séances par semaine", async () => {
    serve([summary("a", "2026-10-26"), summary("b", "2026-10-28"), summary("c", "2026-10-30")]);
    renderWithQuery(<CalendarView initialMonth="2026-10" today="2026-10-31" />);
    expect(await screen.findByLabelText("3 séances la semaine du 26 octobre")).toHaveTextContent(
      "3",
    );
    expect(screen.getByRole("button", { name: "28 octobre, 1 séance" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^27 octobre/ })).toBeNull();
    expect(screen.getByLabelText("Aucune séance la semaine du 19 octobre")).toBeInTheDocument();
  });

  it("deux séances le même jour donnent un jour marqué et 2 dans le total de la semaine", async () => {
    serve([summary("a", "2026-10-28"), summary("b", "2026-10-28")]);
    renderWithQuery(<CalendarView initialMonth="2026-10" today="2026-10-31" />);
    const day = await screen.findByRole("button", { name: "28 octobre, 2 séances" });
    expect(screen.getByLabelText("2 séances la semaine du 26 octobre")).toHaveTextContent("2");
    await userEvent.click(day);
    const list = screen.getByRole("list", { name: "Séances du mercredi 28 octobre" });
    expect(
      within(list)
        .getAllByRole("link")
        .map((l) => l.getAttribute("href")),
    ).toEqual(["/seances/a", "/seances/b"]);
  });

  it("un mois vide affiche « Aucune séance ce mois-ci. »", async () => {
    serve([summary("a", "2026-10-26")]);
    renderWithQuery(<CalendarView initialMonth="2026-11" today="2026-11-15" />);
    expect(await screen.findByText("Aucune séance ce mois-ci.")).toBeInTheDocument();
  });

  it("la navigation passe de novembre 2026 à décembre 2026 puis à janvier 2027", async () => {
    serve([]);
    const onMonthChange = vi.fn();
    renderWithQuery(
      <CalendarView initialMonth="2026-11" today="2026-11-15" onMonthChange={onMonthChange} />,
    );
    expect(screen.getByRole("heading", { name: "novembre 2026" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Mois suivant" }));
    expect(screen.getByRole("heading", { name: "décembre 2026" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Mois suivant" }));
    expect(screen.getByRole("heading", { name: "janvier 2027" })).toBeInTheDocument();
    expect(onMonthChange).toHaveBeenLastCalledWith("2027-01");
    expect(apiFetch).toHaveBeenLastCalledWith("/api/v1/workouts?from=2026-12-28&to=2027-01-31");
  });
});
