// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { Exercise } from "@maroutine/core";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExerciseList } from "@/app/(app)/exercices/exercise-list";
import { renderWithQuery } from "../helpers/render";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  apiFetch,
}));

function exercise(name: string, muscleGroup: Exercise["muscleGroup"], i: number): Exercise {
  return {
    id: `00000000-0000-4000-8000-00000000000${i}`,
    name,
    muscleGroup,
    equipment: "cable",
    repMin: 8,
    repMax: 12,
    incrementKg: 2.5,
    archived: false,
  };
}

const active = [
  exercise("Curl à la poulie", "biceps", 1),
  exercise("Extension triceps à la poulie", "triceps", 2),
  exercise("Face pull", "shoulders", 3),
  exercise("Mon exercice", null, 4),
];

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockImplementation(async (path: string) => {
    if (path === "/api/v1/exercises?filter=active") return active;
    return [];
  });
  renderWithQuery(<ExerciseList />);
});
afterEach(cleanup);

function names() {
  return within(screen.getByRole("list", { name: "Exercices" }))
    .getAllByRole("link")
    .map((link) => link.querySelector("span span")?.textContent);
}

describe("ExerciseList, filtre par muscle (D27)", () => {
  it("propose « Tous », les muscles qui ont des exercices, puis « Non classés »", async () => {
    const filters = await screen.findByRole("group", { name: "Filtrer par muscle" });
    expect(
      within(filters)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Tous", "Épaules", "Biceps", "Triceps", "Non classés"]);
    expect(within(filters).getByRole("button", { name: "Tous" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(names()).toHaveLength(4);
  });

  it("« Triceps » ne montre que les exercices de triceps, « Non classés » ceux sans muscle", async () => {
    await userEvent.click(await screen.findByRole("button", { name: "Triceps" }));
    expect(screen.getByRole("button", { name: "Triceps" })).toHaveAttribute("aria-pressed", "true");
    expect(names()).toEqual(["Extension triceps à la poulie"]);
    await userEvent.click(screen.getByRole("button", { name: "Non classés" }));
    expect(names()).toEqual(["Mon exercice"]);
    await userEvent.click(screen.getByRole("button", { name: "Tous" }));
    expect(names()).toHaveLength(4);
  });
});
