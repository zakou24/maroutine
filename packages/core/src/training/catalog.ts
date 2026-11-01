import type { Equipment } from "./equipment";

// Les bras se séparent en biceps et triceps (D27) : l'ordre est celui de l'affichage.
export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "abs",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

const GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Pectoraux",
  back: "Dos",
  shoulders: "Épaules",
  biceps: "Biceps",
  triceps: "Triceps",
  legs: "Jambes",
  abs: "Abdominaux",
};

export function muscleGroupLabel(group: MuscleGroup): string {
  return GROUP_LABELS[group];
}

export function sortMuscleGroups(groups: readonly MuscleGroup[]): MuscleGroup[] {
  return MUSCLE_GROUPS.filter((group) => groups.includes(group));
}

// Un exercice ajouté à la séance ajoute son groupe aux muscles travaillés (D28) ; un exercice
// sans groupe ne change rien.
export function withMuscleGroup(
  groups: readonly MuscleGroup[],
  group: MuscleGroup | null,
): readonly MuscleGroup[] {
  if (group === null || groups.includes(group)) return groups;
  return sortMuscleGroups([...groups, group]);
}

export type CatalogExercise = { name: string; equipment: Equipment; group: MuscleGroup };

// Exercices courants proposés à l'ajout, pour ne pas tout taper (D16). Une entrée ajoutée devient
// un exercice ordinaire de l'utilisateur : il peut la renommer, la régler ou l'archiver.
export const EXERCISE_CATALOG: readonly CatalogExercise[] = [
  { name: "Développé couché", equipment: "barbell", group: "chest" },
  { name: "Développé incliné", equipment: "barbell", group: "chest" },
  { name: "Développé couché haltères", equipment: "dumbbell", group: "chest" },
  { name: "Développé incliné haltères", equipment: "dumbbell", group: "chest" },
  { name: "Écarté à la poulie", equipment: "cable", group: "chest" },
  { name: "Pec deck", equipment: "machine", group: "chest" },
  { name: "Dips", equipment: "bodyweight", group: "chest" },

  { name: "Tractions", equipment: "bodyweight", group: "back" },
  { name: "Tirage vertical", equipment: "cable", group: "back" },
  { name: "Tirage horizontal", equipment: "cable", group: "back" },
  { name: "Rowing barre", equipment: "barbell", group: "back" },
  { name: "Rowing haltère", equipment: "dumbbell", group: "back" },
  { name: "Rowing machine", equipment: "machine", group: "back" },
  { name: "Soulevé de terre", equipment: "barbell", group: "back" },
  { name: "Pull-over à la poulie", equipment: "cable", group: "back" },

  { name: "Développé militaire", equipment: "barbell", group: "shoulders" },
  { name: "Développé épaules haltères", equipment: "dumbbell", group: "shoulders" },
  { name: "Élévations latérales", equipment: "dumbbell", group: "shoulders" },
  { name: "Élévations latérales à la poulie", equipment: "cable", group: "shoulders" },
  { name: "Oiseau", equipment: "dumbbell", group: "shoulders" },
  { name: "Face pull", equipment: "cable", group: "shoulders" },

  { name: "Squat", equipment: "barbell", group: "legs" },
  { name: "Presse à cuisses", equipment: "machine", group: "legs" },
  { name: "Fentes", equipment: "dumbbell", group: "legs" },
  { name: "Squat bulgare", equipment: "dumbbell", group: "legs" },
  { name: "Soulevé de terre jambes tendues", equipment: "barbell", group: "legs" },
  { name: "Hip thrust", equipment: "barbell", group: "legs" },
  { name: "Leg extension", equipment: "machine", group: "legs" },
  { name: "Leg curl", equipment: "machine", group: "legs" },
  { name: "Mollets debout", equipment: "machine", group: "legs" },

  { name: "Curl barre", equipment: "barbell", group: "biceps" },
  { name: "Curl haltères", equipment: "dumbbell", group: "biceps" },
  { name: "Curl marteau", equipment: "dumbbell", group: "biceps" },
  { name: "Curl à la poulie", equipment: "cable", group: "biceps" },

  { name: "Extension triceps à la poulie", equipment: "cable", group: "triceps" },
  { name: "Barre au front", equipment: "barbell", group: "triceps" },
  { name: "Extension triceps au-dessus de la tête", equipment: "dumbbell", group: "triceps" },

  { name: "Crunch à la poulie", equipment: "cable", group: "abs" },
  { name: "Relevé de jambes", equipment: "bodyweight", group: "abs" },
  { name: "Roue abdominale", equipment: "other", group: "abs" },
];
