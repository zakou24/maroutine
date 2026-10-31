import { describe, expect, it } from "vitest";
import {
  bodyWeightOn,
  estimatedMax,
  isWorkingSet,
  periodStart,
  sessionStats,
  type ExerciseSession,
  type HistorySet,
} from "./stats";

const set = (weightKg: number, reps: number, isWarmup = false): HistorySet => ({
  weightKg,
  reps,
  isWarmup,
});
const session = (sets: HistorySet[], performedOn = "2026-10-30"): ExerciseSession => ({
  workoutId: "w1",
  performedOn,
  sets,
});

describe("estimatedMax (Epley, ADR 0005)", () => {
  it("reprend les exemples du cadrage", () => {
    expect(estimatedMax(20, 3)).toBeCloseTo(22, 5);
    expect(estimatedMax(20, 4)).toBeCloseTo(22.667, 3);
    expect(estimatedMax(25, 3)).toBeCloseTo(27.5, 5);
  });
  it("vaut la charge pour une seule répétition", () => {
    expect(estimatedMax(100, 1)).toBe(100);
  });
});

describe("isWorkingSet", () => {
  it("exclut les anciennes séries d'échauffement et les séries à 0 répétition", () => {
    expect(isWorkingSet(set(20, 5))).toBe(true);
    expect(isWorkingSet(set(20, 5, true))).toBe(false);
    expect(isWorkingSet(set(20, 0))).toBe(false);
  });
});

describe("bodyWeightOn", () => {
  const weighIns = [{ date: "2026-10-01", kg: 79 }];
  it("prend la dernière pesée de J-14 à J", () => {
    expect(bodyWeightOn("2026-10-15", weighIns)).toBe(79);
    expect(bodyWeightOn("2026-10-15", [...weighIns, { date: "2026-10-15", kg: 80 }])).toBe(80);
  });
  it("ignore une pesée à J-15 ou postérieure au jour", () => {
    expect(bodyWeightOn("2026-10-16", weighIns)).toBeNull();
    expect(bodyWeightOn("2026-09-30", weighIns)).toBeNull();
  });
});

describe("sessionStats", () => {
  it("calcule max estimé, meilleure série et volume sur les séries de travail", () => {
    const stats = sessionStats(
      session([set(10, 10, true), set(20, 4), set(25, 3), set(25, 0)]),
      "barbell",
      [],
    );
    expect(stats.estimatedMax).toBeCloseTo(27.5, 5);
    expect(stats.bestSet).toEqual({ weightKg: 25, reps: 3 });
    expect(stats.volumeKg).toBe(20 * 4 + 25 * 3);
    expect(stats.workingSetCount).toBe(2);
    expect(stats.approximate).toBe(false);
  });
  it("à max égal, garde la série à la plus grande charge", () => {
    // 30 × 1 = 30 ; 25 × 6 = 30
    const stats = sessionStats(session([set(25, 6), set(30, 1)]), "barbell", []);
    expect(stats.bestSet).toEqual({ weightKg: 30, reps: 1 });
  });
  it("marque approximatif un max tiré d'une série de plus de 12 répétitions", () => {
    expect(sessionStats(session([set(20, 13)]), "dumbbell", []).approximate).toBe(true);
    expect(sessionStats(session([set(20, 12)]), "dumbbell", []).approximate).toBe(false);
  });
  it("une séance sans série de travail n'a pas de stats", () => {
    expect(sessionStats(session([set(20, 0), set(10, 8, true)]), "barbell", [])).toMatchObject({
      estimatedMax: null,
      bestSet: null,
      volumeKg: null,
      workingSetCount: 0,
      approximate: false,
    });
  });
  it("au poids du corps, ajoute la pesée au lest", () => {
    const stats = sessionStats(session([set(10, 5)], "2026-10-15"), "bodyweight", [
      { date: "2026-10-10", kg: 80 },
    ]);
    expect(stats.estimatedMax).toBeCloseTo(90 * (1 + 5 / 30), 5);
    expect(stats.volumeKg).toBe(450);
    expect(stats.bestSet).toEqual({ weightKg: 10, reps: 5 });
  });
  it("au poids du corps sans pesée, garde la série au plus de répétitions, sans max ni volume", () => {
    const stats = sessionStats(session([set(0, 8), set(0, 11), set(5, 6)]), "bodyweight", []);
    expect(stats.estimatedMax).toBeNull();
    expect(stats.volumeKg).toBeNull();
    expect(stats.bestSet).toEqual({ weightKg: 0, reps: 11 });
    expect(stats.workingSetCount).toBe(3);
  });
});

describe("periodStart", () => {
  it("recule d'un mois en restant dans le mois précédent (Review Focus 4)", () => {
    expect(periodStart("2027-03-31", "1m")).toBe("2027-02-28");
    expect(periodStart("2028-03-31", "1m")).toBe("2028-02-29");
  });
  it("couvre 3 mois, 1 an, ou tout", () => {
    expect(periodStart("2026-10-31", "3m")).toBe("2026-07-31");
    expect(periodStart("2028-02-29", "1y")).toBe("2027-02-28");
    expect(periodStart("2026-10-31", "all")).toBeNull();
  });
});
