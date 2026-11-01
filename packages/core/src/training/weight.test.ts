import { describe, expect, it } from "vitest";
import { formatWeight, weightSeries } from "./weight";

const w = (date: string, weightKg: number) => ({ date, weightKg });

describe("weightSeries (§6.6)", () => {
  it("moyenne des pesées de J-6 à J, avec le couloir du min au max", () => {
    const series = weightSeries(
      [w("2026-10-25", 80), w("2026-10-28", 78), w("2026-10-31", 79)],
      "2026-10-31",
      "2026-10-31",
    );
    expect(series).toEqual([{ date: "2026-10-31", weightKg: 79, average: 79, low: 78, high: 80 }]);
  });
  it("ignore une pesée à J-7 et ne donne rien sous 3 pesées", () => {
    const series = weightSeries(
      [w("2026-10-24", 80), w("2026-10-28", 78), w("2026-10-31", 79)],
      "2026-10-31",
      "2026-10-31",
    );
    expect(series[0]).toEqual({
      date: "2026-10-31",
      weightKg: 79,
      average: null,
      low: null,
      high: null,
    });
  });
  it("donne un point par jour, avec une moyenne même un jour sans pesée", () => {
    const series = weightSeries(
      [w("2026-10-27", 80), w("2026-10-28", 78), w("2026-10-29", 79)],
      "2026-10-29",
      "2026-10-30",
    );
    expect(series.map((p) => p.date)).toEqual(["2026-10-29", "2026-10-30"]);
    expect(series[1]).toMatchObject({ weightKg: null, average: 79 });
  });
  it("lit les pesées antérieures à `from` pour les premiers jours", () => {
    const series = weightSeries(
      [w("2026-09-28", 80), w("2026-09-29", 80), w("2026-10-01", 83)],
      "2026-10-01",
      "2026-10-01",
    );
    expect(series[0]!.average).toBe(81);
  });
});

describe("formatWeight", () => {
  it("affiche une décimale", () => {
    expect(formatWeight(78.4)).toBe("78,4");
    expect(formatWeight(80)).toBe("80,0");
  });
});
