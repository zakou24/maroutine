import { expect, it } from "vitest";
import { normalizeBarcode } from "./barcode";

it("accepte un EAN-13 et un EAN-8 dont la clé est juste", () => {
  expect(normalizeBarcode("3017620422003")).toBe("3017620422003");
  expect(normalizeBarcode("96385074")).toBe("96385074");
});

it("refuse une clé fausse", () => {
  expect(normalizeBarcode("3017620422004")).toBeNull();
  expect(normalizeBarcode("96385075")).toBeNull();
});

it("retire les espaces d'une saisie à la main", () => {
  expect(normalizeBarcode(" 3017 6204 22003 ")).toBe("3017620422003");
});

it("complète un UPC-A d'un 0 en tête, comme Open Food Facts", () => {
  expect(normalizeBarcode("036000291452")).toBe("0036000291452");
  expect(normalizeBarcode("036000291453")).toBeNull();
});

it("refuse ce qui n'est pas un code de 8, 12 ou 13 chiffres", () => {
  for (const raw of [
    "",
    "abc",
    "3017620422a03",
    "12345",
    "30176204220031",
    "0".repeat(13).slice(1) + "x",
  ]) {
    expect(normalizeBarcode(raw)).toBeNull();
  }
});
