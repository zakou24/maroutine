import { z } from "zod";
import {
  MUSCLE_GROUPS,
  formatKg,
  isQuarterKg,
  parseDecimal,
  sortMuscleGroups,
  withMuscleGroup,
  workoutInputSchema,
  type Exercise,
  type MuscleGroup,
  type LastSets,
  type SetInput,
  type Workout,
  type WorkoutInput,
} from "@maroutine/core";

// Brouillon de saisie : le texte tapé est gardé tel quel (« 62,5 ») et n'est converti qu'à l'envoi.
export type DraftSet = {
  key: string;
  weight: string;
  reps: string;
  isWarmup: boolean;
  // Reprise telle quelle de la dernière séance : affichée en retrait jusqu'à ce qu'on la modifie.
  prefilled?: boolean;
};

export type DraftExercise = {
  key: string;
  exerciseId: string;
  name: string;
  sets: DraftSet[];
  // Date de la séance qui a servi au préremplissage, pour la ligne « Prérempli depuis le … ».
  prefilledFrom: string | null;
};

// `id` : identifiant choisi à la création du brouillon, envoyé avec la séance pour qu'un
// enregistrement rejoué ne crée pas de doublon.
export type WorkoutDraft = {
  id?: string;
  performedOn: string;
  note: string;
  // Échauffement de la séance (D14) ; cardio en minutes tapées, null s'il n'y en a pas (D15).
  warmupDone: boolean;
  cardio: string | null;
  // Muscles travaillés, choisis avant la séance (D28).
  muscleGroups: MuscleGroup[];
  exercises: DraftExercise[];
};

export type DraftAction =
  | { type: "setDate"; performedOn: string }
  | {
      type: "addExercise";
      exercise: Pick<Exercise, "id" | "name" | "muscleGroup">;
      lastSets: LastSets;
    }
  | { type: "toggleMuscleGroup"; group: MuscleGroup }
  | { type: "removeExercise"; key: string }
  | { type: "moveExercise"; key: string; direction: "up" | "down" }
  | { type: "addSet"; exerciseKey: string }
  | {
      type: "updateSet";
      exerciseKey: string;
      setKey: string;
      patch: Partial<Pick<DraftSet, "weight" | "reps" | "isWarmup">>;
    }
  | { type: "removeSet"; exerciseKey: string; setKey: string }
  | { type: "setNote"; note: string }
  | { type: "setWarmup"; value: boolean }
  | { type: "setCardio"; value: string | null }
  | { type: "load"; workout: Workout }
  | { type: "restore"; draft: WorkoutDraft };

let counter = 0;
function newKey(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyDraft(performedOn: string): WorkoutDraft {
  return {
    id: crypto.randomUUID(),
    performedOn,
    note: "",
    warmupDone: false,
    cardio: null,
    muscleGroups: [],
    exercises: [],
  };
}

function draftSet(set?: SetInput, prefilled = false): DraftSet {
  return {
    key: newKey(),
    prefilled,
    weight: set ? formatKg(set.weightKg) : "",
    reps: set ? String(set.reps) : "",
    isWarmup: set?.isWarmup ?? false,
  };
}

function mapExercise(
  draft: WorkoutDraft,
  key: string,
  update: (exercise: DraftExercise) => DraftExercise,
): WorkoutDraft {
  return {
    ...draft,
    exercises: draft.exercises.map((e) => (e.key === key ? update(e) : e)),
  };
}

export function draftReducer(state: WorkoutDraft, action: DraftAction): WorkoutDraft {
  switch (action.type) {
    case "setDate":
      return { ...state, performedOn: action.performedOn };
    case "setNote":
      return { ...state, note: action.note };
    case "setWarmup":
      return { ...state, warmupDone: action.value };
    case "setCardio":
      return { ...state, cardio: action.value };
    case "toggleMuscleGroup":
      return {
        ...state,
        muscleGroups: state.muscleGroups.includes(action.group)
          ? state.muscleGroups.filter((g) => g !== action.group)
          : sortMuscleGroups([...state.muscleGroups, action.group]),
      };
    case "addExercise": {
      if (state.exercises.some((e) => e.exerciseId === action.exercise.id)) return state;
      const sets = action.lastSets.sets.map((set) => draftSet(set, true));
      return {
        ...state,
        // Un exercice d'un autre muscle ajoute ce muscle à la séance (D28).
        muscleGroups: [...withMuscleGroup(state.muscleGroups, action.exercise.muscleGroup)],
        exercises: [
          ...state.exercises,
          {
            key: newKey(),
            exerciseId: action.exercise.id,
            name: action.exercise.name,
            sets: sets.length > 0 ? sets : [draftSet()],
            prefilledFrom: sets.length > 0 ? action.lastSets.performedOn : null,
          },
        ],
      };
    }
    case "removeExercise":
      return { ...state, exercises: state.exercises.filter((e) => e.key !== action.key) };
    case "moveExercise": {
      const from = state.exercises.findIndex((e) => e.key === action.key);
      const to = action.direction === "up" ? from - 1 : from + 1;
      if (from < 0 || to < 0 || to >= state.exercises.length) return state;
      const exercises = [...state.exercises];
      [exercises[from], exercises[to]] = [exercises[to]!, exercises[from]!];
      return { ...state, exercises };
    }
    case "addSet":
      return mapExercise(state, action.exerciseKey, (e) => {
        const last = e.sets.at(-1);
        return {
          ...e,
          // Une nouvelle série est toujours une série de travail, même copiée d'une ancienne série
          // d'échauffement (D14).
          sets: [
            ...e.sets,
            { ...(last ?? draftSet()), key: newKey(), prefilled: false, isWarmup: false },
          ],
        };
      });
    case "updateSet":
      return mapExercise(state, action.exerciseKey, (e) => ({
        ...e,
        sets: e.sets.map((s) =>
          s.key === action.setKey ? { ...s, ...action.patch, prefilled: false } : s,
        ),
      }));
    case "removeSet":
      return mapExercise(state, action.exerciseKey, (e) =>
        e.sets.length <= 1 ? e : { ...e, sets: e.sets.filter((s) => s.key !== action.setKey) },
      );
    case "load":
      return {
        performedOn: action.workout.performedOn,
        note: action.workout.note ?? "",
        warmupDone: action.workout.warmupDone,
        cardio: action.workout.cardioMinutes === null ? null : String(action.workout.cardioMinutes),
        muscleGroups: action.workout.muscleGroups,
        exercises: action.workout.exercises.map((e) => ({
          key: newKey(),
          exerciseId: e.exerciseId,
          name: e.name,
          sets: e.sets.map((set) => draftSet(set)),
          prefilledFrom: null,
        })),
      };
    case "restore":
      return action.draft;
  }
}

const REPS = /^\d{1,3}$/;

function parseWeight(text: string): number | null {
  const value = parseDecimal(text);
  return value !== null && value <= 999.75 && isQuarterKg(value) ? value : null;
}

function parseReps(text: string): number | null {
  const trimmed = text.trim();
  if (!REPS.test(trimmed)) return null;
  const value = Number(trimmed);
  return value <= 100 ? value : null;
}

function parseCardio(text: string): number | null {
  const trimmed = text.trim();
  if (!REPS.test(trimmed)) return null;
  const value = Number(trimmed);
  return value >= 1 && value <= 180 ? value : null;
}

// Convertit le brouillon en corps d'API. Les erreurs sont indexées par clé de série
// (ou « exercises » pour une séance vide), pour les afficher à côté du bon champ.
export function toWorkoutInput(
  draft: WorkoutDraft,
): { ok: true; input: WorkoutInput } | { ok: false; errors: Record<string, string> } {
  if (draft.exercises.length === 0) {
    return { ok: false, errors: { exercises: "Ajoute au moins un exercice." } };
  }
  const errors: Record<string, string> = {};
  const exercises = draft.exercises.map((e) => ({
    exerciseId: e.exerciseId,
    sets: e.sets.map((s) => {
      const weightKg = parseWeight(s.weight);
      const reps = parseReps(s.reps);
      if (weightKg === null) errors[s.key] = "Charge invalide";
      else if (reps === null) errors[s.key] = "Répétitions invalides";
      return { weightKg: weightKg ?? 0, reps: reps ?? 0, isWarmup: s.isWarmup };
    }),
  }));
  let cardioMinutes: number | null = null;
  if (draft.cardio !== null) {
    cardioMinutes = parseCardio(draft.cardio);
    if (cardioMinutes === null) errors.cardio = "Durée de cardio entre 1 et 180 minutes.";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const parsed = workoutInputSchema.safeParse({
    performedOn: draft.performedOn,
    note: draft.note.trim() || null,
    warmupDone: draft.warmupDone,
    cardioMinutes,
    muscleGroups: draft.muscleGroups,
    exercises,
  });
  if (!parsed.success) return { ok: false, errors: { exercises: "Séance incomplète." } };
  return { ok: true, input: parsed.data };
}

// Une seule clé pour la nouvelle séance : le brouillon garde sa propre date, et reste retrouvable
// après minuit (Review Focus 2 et 4).
export function draftStorageKey(workoutId?: string): string {
  return workoutId ? `maroutine:draft:seance:${workoutId}` : "maroutine:draft:nouvelle";
}

const storedDraftSchema = z.object({
  id: z.string().optional(),
  performedOn: z.iso.date(),
  note: z.string(),
  // Absents des brouillons écrits avant le Lot 1.1.
  warmupDone: z.boolean().default(false),
  cardio: z.string().nullable().default(null),
  // Absents des brouillons écrits avant le Lot 4.1 (Review Focus 1).
  muscleGroups: z.array(z.enum(MUSCLE_GROUPS)).catch([]).default([]),
  exercises: z.array(
    z.object({
      key: z.string(),
      exerciseId: z.string(),
      name: z.string(),
      prefilledFrom: z.string().nullable(),
      sets: z.array(
        z.object({
          key: z.string(),
          weight: z.string(),
          reps: z.string(),
          isWarmup: z.boolean(),
          prefilled: z.boolean().optional(),
        }),
      ),
    }),
  ),
});

// Un brouillon lu dans localStorage peut être ancien ou abîmé : on l'ignore plutôt que de bloquer l'écran.
export function parseStoredDraft(value: unknown): WorkoutDraft | null {
  const parsed = storedDraftSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
