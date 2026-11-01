import { describe, expect, it } from "vitest";
import {
  copyEntriesSchema,
  foodEntryInputSchema,
  foodEntryPatchSchema,
  foodInputSchema,
  nutritionTargetInputSchema,
} from "./food";

const base = { eatenOn: "2026-10-31", meal: "lunch" };
const foodId = "11111111-1111-4111-8111-111111111111";

describe("schémas d'alimentation", () => {
  it("entrée avec aliment : 1 à 5 000 g", () => {
    expect(foodEntryInputSchema.safeParse({ ...base, foodId, quantityG: 150 }).success).toBe(true);
    expect(foodEntryInputSchema.safeParse({ ...base, foodId, quantityG: 0 }).success).toBe(false);
    expect(foodEntryInputSchema.safeParse({ ...base, foodId, quantityG: 5001 }).success).toBe(
      false,
    );
  });
  it("ajout rapide : libellé obligatoire", () => {
    expect(
      foodEntryInputSchema.safeParse({ ...base, label: "Pizza", kcal: 800, proteinG: 30 }).success,
    ).toBe(true);
    expect(
      foodEntryInputSchema.safeParse({ ...base, label: " ", kcal: 800, proteinG: 30 }).success,
    ).toBe(false);
    expect(foodEntryInputSchema.safeParse({ ...base, kcal: 800, proteinG: 30 }).success).toBe(
      false,
    );
  });
  it("repas connu seulement", () => {
    expect(
      foodEntryInputSchema.safeParse({ ...base, meal: "brunch", foodId, quantityG: 1 }).success,
    ).toBe(false);
  });
  it("modification : au moins un champ", () => {
    expect(foodEntryPatchSchema.safeParse({}).success).toBe(false);
    expect(foodEntryPatchSchema.safeParse({ quantityG: 200 }).success).toBe(true);
  });
  it("copie vers un autre jour", () => {
    expect(
      copyEntriesSchema.safeParse({ fromDate: "2026-10-30", toDate: "2026-10-30" }).success,
    ).toBe(false);
    expect(
      copyEntriesSchema.safeParse({ fromDate: "2026-10-30", toDate: "2026-10-31", meal: "dinner" })
        .success,
    ).toBe(true);
  });
  it("aliment perso et objectifs bornés", () => {
    expect(
      foodInputSchema.safeParse({ name: "Skyr", kcalPer100g: 62, proteinPer100g: 11 }).success,
    ).toBe(true);
    expect(
      foodInputSchema.safeParse({ name: "Skyr", kcalPer100g: 901, proteinPer100g: 11 }).success,
    ).toBe(false);
    expect(
      nutritionTargetInputSchema.safeParse({ validFrom: "2026-10-01", kcal: 2400, proteinG: 150 })
        .success,
    ).toBe(true);
    expect(
      nutritionTargetInputSchema.safeParse({ validFrom: "2026-10-01", kcal: 400, proteinG: 150 })
        .success,
    ).toBe(false);
  });
});
