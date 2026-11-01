import { describe, expect, it } from "vitest";
import { mealLabel, MEALS } from "./meals";
import { dayTotals, entryNutrients, orderSearchResults, scaleEntry, targetOn } from "./nutrients";
import { parseOffHit } from "./off";

const skyr = { kcalPer100g: 62, proteinPer100g: 11 };

describe("valeurs d'une entrée (C6)", () => {
  it("calcule et arrondit à 0,1", () => {
    expect(entryNutrients(skyr, 150)).toEqual({ kcal: 93, proteinG: 16.5 });
    expect(entryNutrients({ kcalPer100g: 33.3, proteinPer100g: 1.1 }, 33)).toEqual({
      kcal: 11,
      proteinG: 0.4,
    });
  });
  it("change la quantité en proportion des valeurs figées", () => {
    expect(scaleEntry({ quantityG: 150, kcal: 93, proteinG: 16.5 }, 300)).toEqual({
      kcal: 186,
      proteinG: 33,
    });
  });
  it("totalise une journée", () => {
    expect(
      dayTotals([
        { kcal: 93, proteinG: 16.5 },
        { kcal: 450.2, proteinG: 30 },
      ]),
    ).toEqual({
      kcal: 543.2,
      proteinG: 46.5,
    });
    expect(dayTotals([])).toEqual({ kcal: 0, proteinG: 0 });
  });
});

describe("targetOn (§6.7)", () => {
  const targets = [
    { validFrom: "2026-10-15", kcal: 2600, proteinG: 160 },
    { validFrom: "2026-10-01", kcal: 2400, proteinG: 150 },
  ];
  it("prend le dernier objectif dont la date d'effet est antérieure ou égale au jour", () => {
    expect(targetOn(targets, "2026-10-14")?.kcal).toBe(2400);
    expect(targetOn(targets, "2026-10-15")?.kcal).toBe(2600);
    expect(targetOn(targets, "2026-09-30")).toBeNull();
  });
});

describe("parseOffHit (T-08)", () => {
  const hit = {
    code: "5690845000621",
    product_name: "Skyr",
    product_name_fr: "Skyr nature",
    brands: ["Isey Skyr", "Autre"],
    nutriments: { "energy-kcal_100g": 62, proteins_100g: 11 },
  };
  it("lit un produit valide, en français d'abord", () => {
    expect(parseOffHit(hit)).toEqual({
      offCode: "5690845000621",
      name: "Skyr nature",
      brand: "Isey Skyr",
      kcalPer100g: 62,
      proteinPer100g: 11,
    });
    expect(parseOffHit({ ...hit, product_name_fr: "", brands: "Isey, Autre" })).toMatchObject({
      name: "Skyr",
      brand: "Isey",
    });
  });
  it("écarte un produit incomplet ou hors bornes", () => {
    expect(
      parseOffHit({ ...hit, nutriments: { "energy-kcal_100g": 2000, proteins_100g: 11 } }),
    ).toBeNull();
    expect(parseOffHit({ ...hit, nutriments: { "energy-kcal_100g": 62 } })).toBeNull();
    expect(parseOffHit({ ...hit, product_name: "", product_name_fr: " " })).toBeNull();
    expect(parseOffHit({ ...hit, code: "abc" })).toBeNull();
    expect(parseOffHit(null)).toBeNull();
  });
});

describe("orderSearchResults (F-ALI-2)", () => {
  const food = (id: string, source: "custom" | "off") => ({
    id,
    name: id,
    brand: null,
    kcalPer100g: 1,
    proteinPer100g: 1,
    source,
  });
  it("perso, puis récents, puis Open Food Facts, sans doublon", () => {
    const results = orderSearchResults(
      [food("perso", "custom")],
      [food("recent", "off"), food("perso", "custom")],
      [food("off", "off"), food("recent", "off")],
    );
    expect(results.map((r) => [r.id, r.recent])).toEqual([
      ["perso", true],
      ["recent", true],
      ["off", false],
    ]);
  });
});

describe("repas (C7)", () => {
  it("quatre repas en français", () => {
    expect(MEALS.map(mealLabel)).toEqual(["Petit-déjeuner", "Déjeuner", "Dîner", "Collation"]);
  });
});
