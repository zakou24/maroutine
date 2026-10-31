export const EQUIPMENT = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "other",
] as const;

export type Equipment = (typeof EQUIPMENT)[number];

const LABELS: Record<Equipment, string> = {
  barbell: "Barre",
  dumbbell: "Haltères",
  machine: "Machine",
  cable: "Poulie",
  bodyweight: "Poids du corps",
  other: "Autre",
};

// Pas d'augmentation proposé à la création d'un exercice (C3) ; modifiable exercice par exercice.
const DEFAULT_INCREMENT_KG: Record<Equipment, number> = {
  barbell: 2.5,
  dumbbell: 2,
  machine: 5,
  cable: 2.5,
  bodyweight: 2.5,
  other: 2.5,
};

export function equipmentLabel(equipment: Equipment): string {
  return LABELS[equipment];
}

export function defaultIncrementKg(equipment: Equipment): number {
  return DEFAULT_INCREMENT_KG[equipment];
}
