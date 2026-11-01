// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { WorkoutSummary } from "@maroutine/core";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activityWeeks } from "@maroutine/core";
import { ActivityCalendar, monthLabels } from "@/app/(app)/activity-calendar";
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
    warmupDone: true,
    cardioMinutes: 15,
    muscleGroups: [],
  };
}

const TODAY = "2026-11-04"; // un mercredi

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue([
    summary("a", "2026-10-26"),
    summary("b", "2026-10-28"),
    summary("c", "2026-10-28"),
    summary("d", "2026-11-02"),
  ]);
  renderWithQuery(<ActivityCalendar today={TODAY} />);
});
afterEach(cleanup);

describe("ActivityCalendar (D17)", () => {
  it("lit les 13 dernières semaines jusqu'à aujourd'hui", async () => {
    await screen.findByRole("button", { name: "26 octobre, 1 séance" });
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/workouts?from=2026-08-10&to=2026-11-04");
  });

  it("marque 1 séance et 2 séances avec deux teintes", async () => {
    const one = await screen.findByRole("button", { name: "26 octobre, 1 séance" });
    const two = screen.getByRole("button", { name: "28 octobre, 2 séances" });
    expect(one.dataset.level).toBe("1");
    expect(two.dataset.level).toBe("2");
  });

  it("un jour sans séance ou futur n'est pas un bouton", async () => {
    await screen.findByRole("button", { name: "26 octobre, 1 séance" });
    expect(screen.queryByRole("button", { name: /^27 octobre/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^5 novembre/ })).toBeNull();
    expect(screen.getAllByRole("button").every((b) => b.getAttribute("aria-label") !== null)).toBe(
      true,
    );
  });

  it("donne un résumé textuel et ouvre les séances d'un jour", async () => {
    const region = await screen.findByRole("region", { name: "3 derniers mois" });
    expect(await within(region).findByText("4 séances")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "28 octobre, 2 séances" }));
    const list = screen.getByRole("list", { name: "Séances du mercredi 28 octobre" });
    expect(
      within(list)
        .getAllByRole("link")
        .map((l) => l.getAttribute("href")),
    ).toEqual(["/seances/b", "/seances/c"]);
    // L'accueil ne montre pas le nombre de séries (retour du propriétaire, Lot 4.1).
    expect(within(list).getAllByRole("link")[0]).toHaveTextContent("3 exercices · cardio 15 min");
    expect(list).not.toHaveTextContent("série");
  });
});

describe("monthLabels", () => {
  it("n'étiquette pas la première colonne si la suivante commence un mois (pas de chevauchement)", () => {
    const labels = monthLabels(activityWeeks("2026-11-16", 13));
    expect(labels[0]).toBe("");
    expect(labels[1]).toBe("sept.");
  });
  it("étiquette la première colonne sinon", () => {
    expect(monthLabels(activityWeeks("2026-11-04", 13))[0]).toBe("août");
  });
});
