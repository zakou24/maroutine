import { describe, expect, it } from "vitest";
import { isTenthKg, weighInInputSchema } from "./body-weight";

describe("pesée (F-POI-1)", () => {
  it("accepte une décimale au plus", () => {
    expect(isTenthKg(78.4)).toBe(true);
    expect(isTenthKg(78)).toBe(true);
    expect(isTenthKg(78.45)).toBe(false);
  });
  it("borne la pesée entre 20 et 300 kg", () => {
    expect(weighInInputSchema.safeParse({ weightKg: 78.4 }).success).toBe(true);
    expect(weighInInputSchema.safeParse({ weightKg: 20 }).success).toBe(true);
    expect(weighInInputSchema.safeParse({ weightKg: 19.9 }).success).toBe(false);
    expect(weighInInputSchema.safeParse({ weightKg: 300.1 }).success).toBe(false);
    expect(weighInInputSchema.safeParse({ weightKg: 78.45 }).success).toBe(false);
  });
});
