import { expect, it } from "vitest";
import { EXERCISE_CATALOG, MUSCLE_GROUPS, muscleGroupLabel } from "./catalog";
import { EQUIPMENT } from "./equipment";

it("propose 40 exercices aux noms uniques, sans tenir compte de la casse", () => {
  expect(EXERCISE_CATALOG).toHaveLength(40);
  const names = EXERCISE_CATALOG.map((e) => e.name.toLowerCase());
  expect(new Set(names).size).toBe(names.length);
  expect(EXERCISE_CATALOG.every((e) => e.name.length <= 60)).toBe(true);
});

it("range chaque exercice dans un groupe musculaire, et aucun groupe n'est vide", () => {
  for (const group of MUSCLE_GROUPS) {
    expect(EXERCISE_CATALOG.some((e) => e.group === group)).toBe(true);
  }
  expect(EXERCISE_CATALOG.every((e) => EQUIPMENT.includes(e.equipment))).toBe(true);
  expect(MUSCLE_GROUPS.map(muscleGroupLabel)).toEqual([
    "Pectoraux",
    "Dos",
    "Épaules",
    "Jambes",
    "Bras",
    "Abdominaux",
  ]);
});
