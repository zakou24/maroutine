import { expect, it } from "vitest";
import { MUSCLE_COLOR, squareBackground } from "@/lib/muscle-colors";

it("un muscle : sa couleur", () => {
  expect(squareBackground(["legs"])).toBe("var(--muscle-legs)");
});

it("deux muscles : un carré coupé en diagonale", () => {
  expect(squareBackground(["chest", "triceps"])).toBe(
    "linear-gradient(135deg, var(--muscle-chest) 50%, var(--muscle-triceps) 50%)",
  );
});

it("trois muscles : des bandes verticales égales", () => {
  expect(squareBackground(["back", "biceps", "abs"])).toBe(
    "linear-gradient(90deg, var(--muscle-back) 0% 33.333%, var(--muscle-biceps) 33.333% 66.667%, var(--muscle-abs) 66.667% 100%)",
  );
});

it("une couleur par groupe, jamais l'orange des régressions", () => {
  expect(Object.keys(MUSCLE_COLOR)).toHaveLength(7);
  expect(Object.values(MUSCLE_COLOR).every((c) => c.startsWith("var(--muscle-"))).toBe(true);
});
