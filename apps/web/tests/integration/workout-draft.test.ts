import type { LastSets, Workout } from "@maroutine/core";
import { describe, expect, it } from "vitest";
import {
  draftReducer,
  draftStorageKey,
  emptyDraft,
  toWorkoutInput,
  type WorkoutDraft,
} from "@/app/(app)/seances/workout-draft";

const SQUAT = { id: "00000000-0000-4000-8000-00000000000a", name: "Squat" };
const BENCH = { id: "00000000-0000-4000-8000-00000000000b", name: "Développé couché" };
const NONE: LastSets = { performedOn: null, sets: [] };

function withSquat(lastSets: LastSets = NONE): WorkoutDraft {
  return draftReducer(emptyDraft("2026-10-31"), { type: "addExercise", exercise: SQUAT, lastSets });
}

function values(draft: WorkoutDraft, index = 0) {
  return draft.exercises[index]!.sets.map((s) => [s.weight, s.reps, s.isWarmup]);
}

describe("draftReducer", () => {
  it("addExercise préremplit avec les séries de la dernière fois", () => {
    const draft = withSquat({
      performedOn: "2026-10-30",
      sets: [
        { weightKg: 65, reps: 6, isWarmup: false },
        { weightKg: 65, reps: 6, isWarmup: false },
        { weightKg: 65, reps: 5, isWarmup: false },
      ],
    });
    expect(values(draft)).toEqual([
      ["65", "6", false],
      ["65", "6", false],
      ["65", "5", false],
    ]);
    expect(draft.exercises[0]).toMatchObject({
      exerciseId: SQUAT.id,
      name: "Squat",
      prefilledFrom: "2026-10-30",
    });
  });

  it("addExercise écrit les charges avec une virgule", () => {
    const draft = withSquat({
      performedOn: "2026-10-30",
      sets: [{ weightKg: 62.5, reps: 8, isWarmup: true }],
    });
    expect(values(draft)).toEqual([["62,5", "8", true]]);
  });

  it("addExercise sans historique crée une série vide", () => {
    expect(values(withSquat())).toEqual([["", "", false]]);
    expect(withSquat().exercises[0]?.prefilledFrom).toBeNull();
  });

  it("addExercise ignore un exercice déjà présent", () => {
    const draft = draftReducer(withSquat(), {
      type: "addExercise",
      exercise: SQUAT,
      lastSets: NONE,
    });
    expect(draft.exercises).toHaveLength(1);
  });

  it("addSet copie la dernière série", () => {
    let draft = withSquat();
    const ex = draft.exercises[0]!;
    draft = draftReducer(draft, {
      type: "updateSet",
      exerciseKey: ex.key,
      setKey: ex.sets[0]!.key,
      patch: { weight: "70", reps: "8" },
    });
    draft = draftReducer(draft, { type: "addSet", exerciseKey: ex.key });
    expect(values(draft)).toEqual([
      ["70", "8", false],
      ["70", "8", false],
    ]);
    expect(new Set(draft.exercises[0]!.sets.map((s) => s.key)).size).toBe(2);
  });

  it("removeSet garde au moins une série", () => {
    const single = withSquat();
    const ex = single.exercises[0]!;
    const unchanged = draftReducer(single, {
      type: "removeSet",
      exerciseKey: ex.key,
      setKey: ex.sets[0]!.key,
    });
    expect(unchanged.exercises[0]!.sets).toHaveLength(1);

    let draft = draftReducer(single, { type: "addSet", exerciseKey: ex.key });
    draft = draftReducer(draft, { type: "addSet", exerciseKey: ex.key });
    draft = draftReducer(draft, {
      type: "removeSet",
      exerciseKey: ex.key,
      setKey: ex.sets[0]!.key,
    });
    expect(draft.exercises[0]!.sets).toHaveLength(2);
    expect(draft.exercises[0]!.sets.map((s) => s.key)).not.toContain(ex.sets[0]!.key);
  });

  it("moveExercise réordonne et load reconstruit un brouillon depuis une séance", () => {
    let draft = draftReducer(withSquat(), { type: "addExercise", exercise: BENCH, lastSets: NONE });
    draft = draftReducer(draft, {
      type: "moveExercise",
      key: draft.exercises[1]!.key,
      direction: "up",
    });
    expect(draft.exercises.map((e) => e.name)).toEqual(["Développé couché", "Squat"]);
    draft = draftReducer(draft, {
      type: "moveExercise",
      key: draft.exercises[0]!.key,
      direction: "up",
    });
    expect(draft.exercises.map((e) => e.name)).toEqual(["Développé couché", "Squat"]);

    const workout: Workout = {
      id: "w1",
      performedOn: "2026-10-28",
      note: "Bonne forme",
      exercises: [
        {
          exerciseId: SQUAT.id,
          name: "Squat",
          archived: true,
          sets: [{ weightKg: 82.5, reps: 5, isWarmup: false }],
        },
      ],
    };
    const loaded = draftReducer(draft, { type: "load", workout });
    expect(loaded).toMatchObject({ performedOn: "2026-10-28", note: "Bonne forme" });
    expect(loaded.exercises.map((e) => e.name)).toEqual(["Squat"]);
    expect(values(loaded)).toEqual([["82,5", "5", false]]);
  });

  it("removeExercise, setDate et setNote", () => {
    let draft = withSquat();
    draft = draftReducer(draft, { type: "setDate", performedOn: "2026-10-30" });
    draft = draftReducer(draft, { type: "setNote", note: "Fatigué du dos" });
    draft = draftReducer(draft, { type: "removeExercise", key: draft.exercises[0]!.key });
    expect(draft).toMatchObject({
      performedOn: "2026-10-30",
      note: "Fatigué du dos",
      exercises: [],
    });
  });
});

describe("toWorkoutInput", () => {
  function filled(weight: string, reps: string) {
    const draft = withSquat();
    const ex = draft.exercises[0]!;
    return draftReducer(draft, {
      type: "updateSet",
      exerciseKey: ex.key,
      setKey: ex.sets[0]!.key,
      patch: { weight, reps },
    });
  }

  it("toWorkoutInput lit « 62,5 » comme 62.5 (Review Focus 1)", () => {
    const result = toWorkoutInput(filled("62,5", "8"));
    expect(result).toEqual({
      ok: true,
      input: {
        performedOn: "2026-10-31",
        note: null,
        exercises: [{ exerciseId: SQUAT.id, sets: [{ weightKg: 62.5, reps: 8, isWarmup: false }] }],
      },
    });
  });

  it("toWorkoutInput signale « Charge invalide » sur « 6,2,5 » avec la clé de la série", () => {
    const draft = filled("6,2,5", "8");
    const result = toWorkoutInput(draft);
    expect(result).toEqual({
      ok: false,
      errors: { [draft.exercises[0]!.sets[0]!.key]: "Charge invalide" },
    });
  });

  it("refuse une charge hors du pas de 0,25 kg, des répétitions vides ou décimales", () => {
    expect(toWorkoutInput(filled("62,3", "8")).ok).toBe(false);
    const empty = filled("60", "");
    expect(toWorkoutInput(empty)).toEqual({
      ok: false,
      errors: { [empty.exercises[0]!.sets[0]!.key]: "Répétitions invalides" },
    });
    expect(toWorkoutInput(filled("60", "7,5")).ok).toBe(false);
  });

  it("toWorkoutInput refuse une séance sans exercice", () => {
    expect(toWorkoutInput(emptyDraft("2026-10-31"))).toEqual({
      ok: false,
      errors: { exercises: "Ajoute au moins un exercice." },
    });
  });

  it("garde la note nettoyée", () => {
    const draft = draftReducer(filled("60", "8"), { type: "setNote", note: "  Dos raide " });
    expect(toWorkoutInput(draft)).toMatchObject({ ok: true, input: { note: "Dos raide" } });
  });
});

describe("draftStorageKey", () => {
  it("distingue une nouvelle séance d'une séance existante", () => {
    expect(draftStorageKey("2026-10-31")).toBe("maroutine:draft:2026-10-31");
    expect(draftStorageKey("2026-10-31", "w1")).toBe("maroutine:draft:seance:w1");
  });
});
