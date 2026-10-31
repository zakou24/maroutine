import { expect, it } from "vitest";
import { EQUIPMENT, defaultIncrementKg, equipmentLabel } from "./equipment";

it("donne le libellé français de chaque matériel", () => {
  expect(EQUIPMENT.map(equipmentLabel)).toEqual([
    "Barre",
    "Haltères",
    "Machine",
    "Poulie",
    "Poids du corps",
    "Autre",
  ]);
  expect(equipmentLabel("bodyweight")).toBe("Poids du corps");
});

it("propose le pas d'augmentation par défaut du matériel", () => {
  expect(defaultIncrementKg("barbell")).toBe(2.5);
  expect(defaultIncrementKg("dumbbell")).toBe(2);
  expect(defaultIncrementKg("machine")).toBe(5);
  expect(defaultIncrementKg("cable")).toBe(2.5);
  expect(defaultIncrementKg("bodyweight")).toBe(2.5);
  expect(defaultIncrementKg("other")).toBe(2.5);
});
