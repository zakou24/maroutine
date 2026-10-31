import {
  formatKg,
  isQuarterKg,
  parseDecimal,
  workoutInputSchema,
  type Exercise,
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

export type WorkoutDraft = { performedOn: string; note: string; exercises: DraftExercise[] };

export type DraftAction =
  | { type: "setDate"; performedOn: string }
  | { type: "addExercise"; exercise: Pick<Exercise, "id" | "name">; lastSets: LastSets }
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
  | { type: "load"; workout: Workout }
  | { type: "restore"; draft: WorkoutDraft };

let counter = 0;
function newKey(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyDraft(performedOn: string): WorkoutDraft {
  return { performedOn, note: "", exercises: [] };
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
    case "addExercise": {
      if (state.exercises.some((e) => e.exerciseId === action.exercise.id)) return state;
      const sets = action.lastSets.sets.map((set) => draftSet(set, true));
      return {
        ...state,
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
          sets: [...e.sets, { ...(last ?? draftSet()), key: newKey(), prefilled: false }],
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
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const parsed = workoutInputSchema.safeParse({
    performedOn: draft.performedOn,
    note: draft.note.trim() || null,
    exercises,
  });
  if (!parsed.success) return { ok: false, errors: { exercises: "Séance incomplète." } };
  return { ok: true, input: parsed.data };
}

export function draftStorageKey(performedOn: string, workoutId?: string): string {
  return workoutId ? `maroutine:draft:seance:${workoutId}` : `maroutine:draft:${performedOn}`;
}
