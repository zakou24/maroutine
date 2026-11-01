// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { MuscleGroup, WorkoutSummary } from "@maroutine/core";
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

function summary(
  id: string,
  performedOn: string,
  muscleGroups: MuscleGroup[] = [],
): WorkoutSummary {
  return {
    id,
    performedOn,
    exerciseCount: 3,
    workingSetCount: 9,
    warmupDone: true,
    cardioMinutes: 15,
    muscleGroups,
  };
}

const TODAY = "2026-11-04"; // un mercredi

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue([
    summary("a", "2026-10-26", ["legs"]),
    summary("b", "2026-10-28", ["legs"]),
    summary("c", "2026-10-28", ["chest", "triceps"]),
    summary("d", "2026-11-02"),
  ]);
  renderWithQuery(<ActivityCalendar today={TODAY} />);
});
afterEach(cleanup);

describe("ActivityCalendar (D17)", () => {
  it("lit les 13 dernières semaines jusqu'à aujourd'hui", async () => {
    await screen.findByRole("button", { name: "26 octobre, 1 séance, Jambes" });
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/workouts?from=2026-08-10&to=2026-11-04");
  });

  it("colore chaque jour par ses muscles, toutes séances du jour réunies (Lot 4.2)", async () => {
    const one = await screen.findByRole("button", { name: "26 octobre, 1 séance, Jambes" });
    const two = screen.getByRole("button", {
      name: "28 octobre, 2 séances, Pectoraux, Triceps, Jambes",
    });
    expect(one.dataset.muscles).toBe("legs");
    expect(two.dataset.muscles).toBe("chest triceps legs");
    // Séance sans muscle (exercices non classés) : nommée sans muscle, carré neutre.
    const none = screen.getByRole("button", { name: "2 novembre, 1 séance" });
    expect(none.dataset.muscles).toBe("");
  });

  it("écrit le chiffre de chaque jour passé, pas celui des jours futurs (Lot 4.2)", async () => {
    const day = await screen.findByRole("button", { name: /^26 octobre/ });
    expect(day).toHaveTextContent(/^26/);
    // 27 août, 27 septembre, 27 octobre ; le 5 novembre est futur.
    const grid = screen.getByRole("region", { name: "3 derniers mois" });
    expect(within(grid).getAllByText("27", { exact: true })).toHaveLength(3);
    expect(within(grid).getAllByText("5", { exact: true })).toHaveLength(2);
  });

  it("légende : les muscles présents sur les 3 mois, dans l'ordre des groupes, et « Sans muscle »", async () => {
    const legend = await screen.findByRole("list", { name: "Couleurs des muscles" });
    expect(
      within(legend)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["Pectoraux", "Triceps", "Jambes", "Sans muscle"]);
  });

  it("un jour sans séance ou futur n'est pas un bouton", async () => {
    await screen.findByRole("button", { name: "26 octobre, 1 séance, Jambes" });
    expect(screen.queryByRole("button", { name: /^27 octobre/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^5 novembre/ })).toBeNull();
    // Chaque jour de séance est nommé par sa date, même le 1er du mois.
    expect(
      screen
        .getAllByRole("button")
        .every((b) => /^\d+(er)? \p{L}+, \d séances?/u.test(b.textContent ?? "")),
    ).toBe(true);
  });

  it("donne un résumé textuel et ouvre les séances d'un jour", async () => {
    const region = await screen.findByRole("region", { name: "3 derniers mois" });
    expect(await within(region).findByText("4 séances")).toBeInTheDocument();
    const day = screen.getByRole("button", { name: /^28 octobre, 2 séances/ });
    await userEvent.click(day);
    expect(day).toHaveAttribute("aria-pressed", "true");
    const list = screen.getByRole("list", { name: "Séances du mercredi 28 octobre" });
    expect(
      within(list)
        .getAllByRole("link")
        .map((l) => l.getAttribute("href")),
    ).toEqual(["/seances/b", "/seances/c"]);
    // L'accueil ne montre pas le nombre de séries (retour du propriétaire, Lot 4.1).
    expect(within(list).getAllByRole("link")[0]).toHaveTextContent("3 exercices · cardio 15 min");
    expect(list).not.toHaveTextContent("série");
    // Les muscles de chaque séance, nommés (la couleur n'est pas la seule information).
    expect(within(list).getAllByRole("link")[0]).toHaveTextContent("Jambes");
    expect(within(list).getAllByRole("link")[1]).toHaveTextContent("Pectoraux");
    expect(within(list).getAllByRole("link")[1]).toHaveTextContent("Triceps");
  });
});

describe("ActivityCalendar, clavier (revue du Lot 4.2)", () => {
  it("le focus clavier garde son propre contour sur le jour choisi et sur aujourd'hui", async () => {
    // « aujourd'hui » (4 novembre) a une séance : son carré est un bouton marqué en pointillés.
    apiFetch.mockResolvedValue([summary("t", TODAY, ["legs"])]);
    cleanup();
    renderWithQuery(<ActivityCalendar today={TODAY} />);
    const today = await screen.findByRole("button", { name: /^4 novembre/ });
    await userEvent.click(today);
    expect(today).toHaveAttribute("aria-pressed", "true");
    // Les marques « choisi » et « aujourd'hui » sont des contours : le focus doit les remplacer.
    expect(today.className).toContain("focus-visible:outline-action");
    expect(today.className).toContain("focus-visible:outline-solid");
    expect(today.className).toContain("focus-visible:outline-offset-2");
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
