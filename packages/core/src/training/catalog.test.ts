import { expect, it } from "vitest";
import {
  EXERCISE_CATALOG,
  MUSCLE_GROUPS,
  muscleGroupLabel,
  sessionMuscleGroups,
  sortMuscleGroups,
  withMuscleGroup,
} from "./catalog";
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
    "Biceps",
    "Triceps",
    "Jambes",
    "Abdominaux",
  ]);
});

it("sépare les bras en biceps et triceps (D27)", () => {
  const of = (group: string) =>
    EXERCISE_CATALOG.filter((e) => e.group === group).map((e) => e.name);
  expect(of("arms")).toEqual([]);
  expect(of("biceps")).toEqual(["Curl barre", "Curl haltères", "Curl marteau", "Curl à la poulie"]);
  expect(of("triceps")).toEqual([
    "Extension triceps à la poulie",
    "Barre au front",
    "Extension triceps au-dessus de la tête",
  ]);
  expect(EXERCISE_CATALOG.find((e) => e.name === "Dips")?.group).toBe("chest");
});

it("range les groupes dans l'ordre du catalogue, sans doublon", () => {
  expect(sortMuscleGroups(["abs", "chest", "abs"])).toEqual(["chest", "abs"]);
  expect(sortMuscleGroups([])).toEqual([]);
});

it("ajoute le groupe d'un exercice à la séance s'il manque", () => {
  expect(withMuscleGroup(["chest"], "triceps")).toEqual(["chest", "triceps"]);
  expect(withMuscleGroup(["triceps"], "shoulders")).toEqual(["shoulders", "triceps"]);
  expect(withMuscleGroup(["chest"], "chest")).toEqual(["chest"]);
  const groups = ["back" as const];
  expect(withMuscleGroup(groups, null)).toBe(groups);
});

it("les muscles d'une séance : ceux choisis, sinon ceux de ses exercices (Lot 4.2)", () => {
  expect(sessionMuscleGroups(["abs"], ["legs"])).toEqual(["abs"]);
  expect(sessionMuscleGroups([], ["triceps", null, "chest", "triceps"])).toEqual([
    "chest",
    "triceps",
  ]);
  expect(sessionMuscleGroups([], [null])).toEqual([]);
});
