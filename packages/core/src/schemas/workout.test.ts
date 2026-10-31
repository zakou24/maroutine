import { describe, expect, it } from "vitest";
import { isoDateSchema, setInputSchema, workoutInputSchema } from "./workout";

const ID_A = "00000000-0000-4000-8000-00000000000a";
const ID_B = "00000000-0000-4000-8000-00000000000b";
const set = { weightKg: 60, reps: 8 };

function withExercises(exercises: unknown[]) {
  return { performedOn: "2026-10-31", exercises };
}
function withSets(count: number) {
  return withExercises([{ exerciseId: ID_A, sets: Array.from({ length: count }, () => set) }]);
}

describe("setInputSchema", () => {
  it("accepte une charge au pas de 0,25 kg et met isWarmup à false par défaut", () => {
    expect(setInputSchema.parse({ weightKg: 62.5, reps: 8 })).toEqual({
      weightKg: 62.5,
      reps: 8,
      isWarmup: false,
    });
    expect(setInputSchema.safeParse({ weightKg: 0, reps: 0 }).success).toBe(true);
    expect(setInputSchema.safeParse({ weightKg: 999.75, reps: 100 }).success).toBe(true);
  });
  it("refuse une charge hors du pas, hors bornes, et des répétitions non entières", () => {
    expect(setInputSchema.safeParse({ weightKg: 62.3, reps: 8 }).success).toBe(false);
    expect(setInputSchema.safeParse({ weightKg: 1000, reps: 8 }).success).toBe(false);
    expect(setInputSchema.safeParse({ weightKg: -2.5, reps: 8 }).success).toBe(false);
    expect(setInputSchema.safeParse({ weightKg: 60, reps: 7.5 }).success).toBe(false);
    expect(setInputSchema.safeParse({ weightKg: 60, reps: 101 }).success).toBe(false);
  });
});

describe("isoDateSchema", () => {
  it("accepte une date réelle AAAA-MM-JJ", () => {
    expect(isoDateSchema.safeParse("2026-10-31").success).toBe(true);
    expect(isoDateSchema.safeParse("2028-02-29").success).toBe(true);
  });
  it("refuse une date impossible ou mal écrite", () => {
    expect(isoDateSchema.safeParse("2026-02-30").success).toBe(false);
    expect(isoDateSchema.safeParse("2026-2-3").success).toBe(false);
    expect(isoDateSchema.safeParse("2026-10-31T10:00:00Z").success).toBe(false);
  });
});

describe("workoutInputSchema", () => {
  it("accepte une séance complète, note comprise", () => {
    const parsed = workoutInputSchema.parse({ ...withSets(3), note: "  Bonne forme " });
    expect(parsed.note).toBe("Bonne forme");
    expect(parsed.exercises[0]?.sets).toHaveLength(3);
  });
  it("demande au moins 1 exercice et au plus 20", () => {
    expect(workoutInputSchema.safeParse(withExercises([])).success).toBe(false);
    const many = Array.from({ length: 21 }, (_, i) => ({
      exerciseId: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      sets: [set],
    }));
    expect(workoutInputSchema.safeParse(withExercises(many)).success).toBe(false);
  });
  it("refuse le même exercice deux fois", () => {
    const twice = withExercises([
      { exerciseId: ID_A, sets: [set] },
      { exerciseId: ID_B, sets: [set] },
      { exerciseId: ID_A, sets: [set] },
    ]);
    expect(workoutInputSchema.safeParse(twice).success).toBe(false);
  });
  it("demande de 1 à 20 séries par exercice", () => {
    expect(workoutInputSchema.safeParse(withSets(0)).success).toBe(false);
    expect(workoutInputSchema.safeParse(withSets(20)).success).toBe(true);
    expect(workoutInputSchema.safeParse(withSets(21)).success).toBe(false);
  });
  it("refuse une note de plus de 500 caractères et un identifiant mal formé", () => {
    expect(workoutInputSchema.safeParse({ ...withSets(1), note: "x".repeat(501) }).success).toBe(
      false,
    );
    expect(
      workoutInputSchema.safeParse(withExercises([{ exerciseId: "42", sets: [set] }])).success,
    ).toBe(false);
  });
});

describe("échauffement et cardio de la séance", () => {
  it("échauffement à false et cardio absent par défaut", () => {
    const parsed = workoutInputSchema.parse(withSets(1));
    expect(parsed.warmupDone).toBe(false);
    expect(parsed.cardioMinutes ?? null).toBeNull();
  });
  it("accepte 15 minutes de cardio et null", () => {
    expect(
      workoutInputSchema.parse({ ...withSets(1), cardioMinutes: 15, warmupDone: true }),
    ).toMatchObject({
      cardioMinutes: 15,
      warmupDone: true,
    });
    expect(workoutInputSchema.safeParse({ ...withSets(1), cardioMinutes: null }).success).toBe(
      true,
    );
  });
  it("refuse 0, 181 et 12,5 minutes", () => {
    for (const cardioMinutes of [0, 181, 12.5]) {
      expect(workoutInputSchema.safeParse({ ...withSets(1), cardioMinutes }).success).toBe(false);
    }
  });
});
