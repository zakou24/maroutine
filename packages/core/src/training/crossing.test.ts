import { describe, expect, it } from "vitest";
import { crossing, crossingText, formatChange, progressions, type Progression } from "./crossing";
import type { SessionStats } from "./stats";

function s(workoutId: string, performedOn: string, estimatedMax: number | null): SessionStats {
  return {
    workoutId,
    performedOn,
    estimatedMax,
    approximate: false,
    bestSet: null,
    volumeKg: null,
    workingSetCount: 3,
  };
}

describe("progressions (§6.8)", () => {
  it("rapporte chaque séance à la précédente qui a un max estimé", () => {
    const list = progressions("squat", [
      s("a", "2026-10-01", 100),
      s("b", "2026-10-04", null),
      s("c", "2026-10-08", 102),
    ]);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      exerciseId: "squat",
      workoutId: "c",
      performedOn: "2026-10-08",
    });
    expect(list[0]!.change).toBeCloseTo(0.02);
  });

  it("exclut une paire espacée de plus de 21 jours, garde 21 jours", () => {
    expect(progressions("x", [s("a", "2026-10-01", 100), s("b", "2026-10-23", 110)])).toEqual([]);
    expect(progressions("x", [s("a", "2026-10-01", 100), s("b", "2026-10-22", 110)])).toHaveLength(
      1,
    );
  });

  it("la première séance n'a pas de progression", () => {
    expect(progressions("x", [s("a", "2026-10-01", 100)])).toEqual([]);
  });
});

function p(workoutId: string, performedOn: string, change: number, exerciseId = "x"): Progression {
  return { exerciseId, workoutId, performedOn, change };
}

const ENGAGED_DAYS = new Set([
  "2026-10-01",
  "2026-10-02",
  "2026-10-03",
  "2026-10-04",
  "2026-10-05",
]);
const windowOf = (date: string) =>
  date === "2026-10-30" ? null : ENGAGED_DAYS.has(date) ? "engaged" : "notEngaged";

describe("croisement (§6.8, F-TDB-3, F-TDB-4)", () => {
  const engaged = ["01", "02", "03", "04", "05"].map((d, i) => p(`e${i}`, `2026-10-${d}`, 0.02));
  const other = ["10", "11", "12", "13", "14"].map((d, i) => p(`n${i}`, `2026-10-${d}`, -0.01));

  it("au-dessus du seuil : moyennes, progressions et séances de chaque groupe", () => {
    const c = crossing([...engaged, ...other], windowOf);
    expect(c.enough).toBe(true);
    expect(c.engaged).toMatchObject({ progressions: 5, sessions: 5, missing: 0 });
    expect(c.engaged.mean).toBeCloseTo(0.02);
    expect(c.notEngaged.mean).toBeCloseTo(-0.01);
  });

  it("sous 5 séances dans un groupe : aucune moyenne, et les séances manquantes", () => {
    const c = crossing([...engaged, ...other.slice(1)], windowOf);
    expect(c.enough).toBe(false);
    expect(c.engaged.mean).toBeNull();
    expect(c.notEngaged.mean).toBeNull();
    expect(c.notEngaged).toMatchObject({ sessions: 4, missing: 1 });
    expect(c.engaged.missing).toBe(0);
  });

  it("deux exercices de la même séance : 2 progressions, 1 séance", () => {
    const c = crossing(
      [p("w", "2026-10-01", 0.01, "squat"), p("w", "2026-10-01", 0.03, "bench")],
      windowOf,
    );
    expect(c.engaged).toMatchObject({ progressions: 2, sessions: 1, missing: 4 });
  });

  it("une fenêtre non classée est exclue", () => {
    expect(crossing([p("z", "2026-10-30", 0.5)], windowOf).notEngaged.progressions).toBe(0);
  });
});

describe("phrases du croisement", () => {
  it("compare les deux groupes, sans lien de cause", () => {
    expect(
      crossingText({
        enough: true,
        engaged: { mean: 0.0183, progressions: 20, sessions: 12, missing: 0 },
        notEngaged: { mean: -0.004, progressions: 9, sessions: 7, missing: 0 },
      }),
    ).toBe(
      "Après 3 jours bien suivis, ton max estimé a progressé en moyenne de +1,8 % (12 séances), contre −0,4 % sinon (7 séances).",
    );
  });

  it("une moyenne négative après des jours bien suivis : « a évolué »", () => {
    expect(
      crossingText({
        enough: true,
        engaged: { mean: -0.002, progressions: 6, sessions: 5, missing: 0 },
        notEngaged: { mean: 0.01, progressions: 6, sessions: 5, missing: 0 },
      }),
    ).toBe(
      "Après 3 jours bien suivis, ton max estimé a évolué en moyenne de −0,2 % (5 séances), contre +1,0 % sinon (5 séances).",
    );
  });

  it("sous le seuil : les séances manquantes de chaque groupe", () => {
    const group = (missing: number) => ({
      mean: null,
      progressions: 0,
      sessions: 5 - missing,
      missing,
    });
    expect(crossingText({ enough: false, engaged: group(2), notEngaged: group(5) })).toBe(
      "Pas encore assez de données : il manque 2 séances après des jours bien suivis et 5 après les autres.",
    );
    expect(crossingText({ enough: false, engaged: group(1), notEngaged: group(0) })).toBe(
      "Pas encore assez de données : il manque 1 séance après des jours bien suivis.",
    );
    expect(crossingText({ enough: false, engaged: group(0), notEngaged: group(3) })).toBe(
      "Pas encore assez de données : il manque 3 séances après des jours moins bien suivis.",
    );
  });

  it("formatChange : arrondi à 0,1 et signe toujours écrit", () => {
    expect(formatChange(0.0183)).toBe("+1,8 %");
    expect(formatChange(-0.004)).toBe("−0,4 %");
    expect(formatChange(-0.0004)).toBe("0,0 %");
    expect(formatChange(0)).toBe("0,0 %");
  });
});
