import { describe, expect, it } from "vitest";
import { exerciseInputSchema, exercisePatchSchema } from "./exercise";

describe("exerciseInputSchema", () => {
  it("nettoie le nom et applique la fourchette 6–10 et le pas du matériel", () => {
    expect(
      exerciseInputSchema.parse({
        name: "  Développé couché ",
        muscleGroup: "chest",
        equipment: "barbell",
      }),
    ).toEqual({
      name: "Développé couché",
      muscleGroup: "chest",
      equipment: "barbell",
      repMin: 6,
      repMax: 10,
      incrementKg: 2.5,
    });
    expect(
      exerciseInputSchema.parse({ name: "Curl", muscleGroup: "chest", equipment: "dumbbell" })
        .incrementKg,
    ).toBe(2);
    expect(
      exerciseInputSchema.parse({ name: "Presse", muscleGroup: "chest", equipment: "machine" })
        .incrementKg,
    ).toBe(5);
  });

  it("garde un pas fourni", () => {
    expect(
      exerciseInputSchema.parse({
        name: "Curl",
        muscleGroup: "chest",
        equipment: "dumbbell",
        incrementKg: 1.25,
      }).incrementKg,
    ).toBe(1.25);
  });

  it("refuse un nom vide ou de plus de 60 caractères", () => {
    expect(
      exerciseInputSchema.safeParse({ name: "", muscleGroup: "chest", equipment: "barbell" })
        .success,
    ).toBe(false);
    expect(
      exerciseInputSchema.safeParse({ name: "   ", muscleGroup: "chest", equipment: "barbell" })
        .success,
    ).toBe(false);
    expect(
      exerciseInputSchema.safeParse({
        name: "x".repeat(61),
        muscleGroup: "chest",
        equipment: "barbell",
      }).success,
    ).toBe(false);
  });

  it("refuse une fourchette incohérente ou hors bornes", () => {
    const base = { name: "A", muscleGroup: "chest", equipment: "barbell" };
    expect(exerciseInputSchema.safeParse({ ...base, repMin: 10, repMax: 6 }).success).toBe(false);
    expect(exerciseInputSchema.safeParse({ ...base, repMin: 0 }).success).toBe(false);
    expect(exerciseInputSchema.safeParse({ ...base, repMax: 51 }).success).toBe(false);
    expect(exerciseInputSchema.safeParse({ ...base, repMin: 6.5 }).success).toBe(false);
    expect(exerciseInputSchema.safeParse({ ...base, repMin: 8, repMax: 8 }).success).toBe(true);
  });

  it("refuse un pas nul, de plus de 20 kg ou hors du pas de 0,25 kg", () => {
    const base = { name: "A", muscleGroup: "chest", equipment: "barbell" };
    expect(exerciseInputSchema.safeParse({ ...base, incrementKg: 0 }).success).toBe(false);
    expect(exerciseInputSchema.safeParse({ ...base, incrementKg: 1.3 }).success).toBe(false);
    expect(exerciseInputSchema.safeParse({ ...base, incrementKg: 20.25 }).success).toBe(false);
    expect(exerciseInputSchema.safeParse({ ...base, incrementKg: 20 }).success).toBe(true);
  });

  it("demande un groupe musculaire connu (D27)", () => {
    expect(exerciseInputSchema.safeParse({ name: "A", equipment: "barbell" }).success).toBe(false);
    for (const muscleGroup of ["arms", "", null]) {
      expect(
        exerciseInputSchema.safeParse({ name: "A", equipment: "barbell", muscleGroup }).success,
      ).toBe(false);
    }
    expect(
      exerciseInputSchema.parse({ name: "A", equipment: "barbell", muscleGroup: "triceps" })
        .muscleGroup,
    ).toBe("triceps");
  });

  it("refuse un matériel inconnu", () => {
    expect(
      exerciseInputSchema.safeParse({ name: "A", muscleGroup: "chest", equipment: "kettlebell" })
        .success,
    ).toBe(false);
  });
});

describe("exercisePatchSchema", () => {
  it("accepte un sous-ensemble des champs et l'archivage", () => {
    expect(exercisePatchSchema.parse({ archived: true })).toEqual({ archived: true });
    expect(exercisePatchSchema.parse({ name: " Squat " })).toEqual({ name: "Squat" });
  });
  it("accepte un groupe musculaire, et refuse un groupe inconnu ou null", () => {
    expect(exercisePatchSchema.parse({ muscleGroup: "biceps" })).toEqual({ muscleGroup: "biceps" });
    expect(exercisePatchSchema.safeParse({ muscleGroup: "arms" }).success).toBe(false);
    expect(exercisePatchSchema.safeParse({ muscleGroup: null }).success).toBe(false);
  });
  it("valide chaque champ fourni", () => {
    expect(exercisePatchSchema.safeParse({ incrementKg: 1.3 }).success).toBe(false);
    expect(exercisePatchSchema.safeParse({ repMax: 51 }).success).toBe(false);
  });
  it("n'ajoute aucune valeur par défaut", () => {
    expect(exercisePatchSchema.parse({})).toEqual({});
  });
});
