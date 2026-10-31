import { describe, expect, it } from "vitest";
import { formatKg, parseDecimal } from "./decimal";

describe("parseDecimal", () => {
  it("lit la virgule du clavier iPhone (Review Focus 1)", () => {
    expect(parseDecimal("62,5")).toBe(62.5);
  });
  it("lit le point et ignore les espaces autour", () => {
    expect(parseDecimal(" 62.5 ")).toBe(62.5);
    expect(parseDecimal("70")).toBe(70);
  });
  it("rejette le reste", () => {
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("6,2,5")).toBeNull();
    expect(parseDecimal("-5")).toBeNull();
    expect(parseDecimal("+5")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal("1e3")).toBeNull();
    expect(parseDecimal(",5")).toBeNull();
    expect(parseDecimal("5,")).toBeNull();
  });
});

describe("formatKg", () => {
  it("écrit à la française, sans zéros inutiles", () => {
    expect(formatKg(62.5)).toBe("62,5");
    expect(formatKg(60)).toBe("60");
    expect(formatKg(1.25)).toBe("1,25");
  });
});
