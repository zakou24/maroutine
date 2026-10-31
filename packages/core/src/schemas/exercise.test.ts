import { describe, expect, it } from "vitest";
import { exerciseInputSchema, exercisePatchSchema } from "./exercise";

describe("exerciseInputSchema", () => {
  it("nettoie le nom et applique la fourchette 6–10 et le pas du matériel", () => {
    expect(
      exerciseInputSchema.parse({ name: "  Développé couché ", equipment: "barbell" }),
    ).toEqual({
      name: "Développé couché",
      equipment: "barbell",
      repMin: 6,
      repMax: 10,
      incrementKg: 2.5,
    });
    expect(exerciseInputSchema.parse({ name: "Curl", equipment: "dumbbell" }).incrementKg).toBe(2);
    expect(exerciseInputSchema.parse({ name: "Presse", equipment: "machine" }).incrementKg).toBe(5);
  });

  it("garde un pas fourni", () => {
    expect(
      exerciseInputSchema.parse({ name: "Curl", equipment: "dumbbell", incrementKg: 1.25 })
        .incrementKg,
    ).toBe(1.25);
  });

  it("refuse un nom vide ou de plus de 60 caractères", () => {
    expect(exerciseInputSchema.safeParse({ name: "", equipment: "barbell" }).success).toBe(false);
    expect(exerciseInputSchema.safeParse({ name: "   ", equipment: "barbell" }).success).toBe(
      false,
    );
    expect(
      exerciseInputSchema.safeParse({ name: "x".repeat(61), equipment: "barbell" }).success,
    ).toBe(false);
  });

  it("refuse une fourchette incohérente ou hors bornes", () => {
    const base = { name: "A", equipment: "barbell" };
    expect(exerciseInputSchema.safeParse({ ...base, repMin: 10, repMax: 6 }).success).toBe(false);
    expect(exerciseInputSchema.safeParse({ ...base, repMin: 0 }).success).toBe(false);
    expect(exerciseInputSchema.safeParse({ ...base, repMax: 51 }).success).toBe(false);
    expect(exerciseInputSchema.safeParse({ ...base, repMin: 6.5 }).success).toBe(false);
    expect(exerciseInputSchema.safeParse({ ...base, repMin: 8, repMax: 8 }).success).toBe(true);
  });

  it("refuse un pas nul, de plus de 20 kg ou hors du pas de 0,25 kg", () => {
    const base = { name: "A", equipment: "barbell" };
    expect(exerciseInputSchema.safeParse({ ...base, incrementKg: 0 }).success).toBe(false);
    expect(exerciseInputSchema.safeParse({ ...base, incrementKg: 1.3 }).success).toBe(false);
    expect(exerciseInputSchema.safeParse({ ...base, incrementKg: 20.25 }).success).toBe(false);
    expect(exerciseInputSchema.safeParse({ ...base, incrementKg: 20 }).success).toBe(true);
  });

  it("refuse un matériel inconnu", () => {
    expect(exerciseInputSchema.safeParse({ name: "A", equipment: "kettlebell" }).success).toBe(
      false,
    );
  });
});

describe("exercisePatchSchema", () => {
  it("accepte un sous-ensemble des champs et l'archivage", () => {
    expect(exercisePatchSchema.parse({ archived: true })).toEqual({ archived: true });
    expect(exercisePatchSchema.parse({ name: " Squat " })).toEqual({ name: "Squat" });
  });
  it("valide chaque champ fourni", () => {
    expect(exercisePatchSchema.safeParse({ incrementKg: 1.3 }).success).toBe(false);
    expect(exercisePatchSchema.safeParse({ repMax: 51 }).success).toBe(false);
  });
  it("n'ajoute aucune valeur par défaut", () => {
    expect(exercisePatchSchema.parse({})).toEqual({});
  });
});
