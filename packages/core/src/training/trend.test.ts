import { describe, expect, it } from "vitest";
import type { SessionStats } from "./stats";
import { exerciseTrend, trendCorridor, trendLabel } from "./trend";

// Une séance par jour à partir du 1er octobre 2026.
function history(maxima: (number | null)[], start = 1): SessionStats[] {
  return maxima.map((m, i) => ({
    workoutId: `w${i}`,
    performedOn: `2026-10-${String(start + i).padStart(2, "0")}`,
    estimatedMax: m,
    approximate: false,
    bestSet: m === null ? null : { weightKg: m, reps: 1 },
    volumeKg: m,
    workingSetCount: 1,
  }));
}

describe("exerciseTrend (§6.4)", () => {
  it("manque de données sous 6 séances avec un max estimé", () => {
    expect(exerciseTrend(history([100, null, 101, null, 102, null, 103, 104]), "2026-10-08")).toBe(
      "insufficient",
    );
  });
  it("inactif au-delà de 30 jours depuis la dernière de ces séances", () => {
    const h = history([100, 100, 100, 100, 100, 100]); // dernière le 6 octobre
    expect(exerciseTrend(h, "2026-11-06")).toBe("inactive");
    expect(exerciseTrend(h, "2026-11-05")).toBe("stalling");
  });
  it("compare la moyenne des 3 dernières aux 3 précédentes, seuils stricts à 1 %", () => {
    expect(exerciseTrend(history([100, 100, 100, 101.01, 101.01, 101.01]), "2026-10-06")).toBe(
      "progressing",
    );
    expect(exerciseTrend(history([100, 100, 100, 101, 101, 101]), "2026-10-06")).toBe("stalling");
    expect(exerciseTrend(history([100, 100, 100, 98.99, 98.99, 98.99]), "2026-10-06")).toBe(
      "regressing",
    );
  });
  it("ne regarde que les 6 dernières séances", () => {
    expect(exerciseTrend(history([10, 100, 100, 100, 100, 100, 100]), "2026-10-07")).toBe(
      "stalling",
    );
  });
});

describe("trendLabel", () => {
  it("donne les libellés de l'interface", () => {
    expect(trendLabel("progressing")).toBe("En progression");
    expect(trendLabel("stalling")).toBe("En stagnation");
    expect(trendLabel("regressing")).toBe("En régression");
    expect(trendLabel("inactive")).toBe("Inactif");
    expect(trendLabel("insufficient")).toBe("Pas assez de données");
  });
});

describe("trendCorridor", () => {
  it("couvre le min et le max des 3 dernières séances avec un max, celle-ci comprise", () => {
    const corridor = trendCorridor(history([100, null, 104, 98, 102]));
    expect(corridor.map((p) => p.workoutId)).toEqual(["w0", "w2", "w3", "w4"]);
    expect(corridor[0]).toMatchObject({ value: 100, low: 100, high: 100 });
    expect(corridor[2]).toMatchObject({ value: 98, low: 98, high: 104 });
    expect(corridor[3]).toMatchObject({
      performedOn: "2026-10-05",
      value: 102,
      low: 98,
      high: 104,
    });
  });
});
