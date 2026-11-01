import type { MuscleGroup } from "@maroutine/core";

// Couleurs des groupes musculaires (jetons --muscle-* de globals.css, Lot 4.2).
export const MUSCLE_COLOR: Record<MuscleGroup, string> = {
  chest: "var(--muscle-chest)",
  back: "var(--muscle-back)",
  shoulders: "var(--muscle-shoulders)",
  biceps: "var(--muscle-biceps)",
  triceps: "var(--muscle-triceps)",
  legs: "var(--muscle-legs)",
  abs: "var(--muscle-abs)",
};

function percent(value: number) {
  return `${Number(value.toFixed(3))}%`;
}

// Fond d'un carré du calendrier d'activité : une couleur, deux en diagonale, trois et plus en
// bandes verticales égales.
export function squareBackground(groups: readonly MuscleGroup[]): string {
  const colors = groups.map((group) => MUSCLE_COLOR[group]);
  if (colors.length === 1) return colors[0]!;
  if (colors.length === 2) return `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)`;
  const step = 100 / colors.length;
  const bands = colors.map(
    (color, i) => `${color} ${percent(i * step)} ${percent((i + 1) * step)}`,
  );
  return `linear-gradient(90deg, ${bands.join(", ")})`;
}
