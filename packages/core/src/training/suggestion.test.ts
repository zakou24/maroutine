import { describe, expect, it } from "vitest";
import { sessionStats, type ExerciseSession, type HistorySet } from "./stats";
import { loadLabel, suggestNext, suggestionText, targetLabel } from "./suggestion";

const barbell = { equipment: "barbell", repMin: 6, repMax: 10, incrementKg: 2.5 } as const;
const pullUp = { equipment: "bodyweight", repMin: 8, repMax: 12, incrementKg: 2.5 } as const;

const s = (weightKg: number, reps: number, isWarmup = false): HistorySet => ({
  weightKg,
  reps,
  isWarmup,
});

function run(sets: HistorySet[][], exercise: typeof barbell | typeof pullUp = barbell) {
  const sessions: ExerciseSession[] = sets.map((list, i) => ({
    workoutId: `w${i}`,
    performedOn: `2026-10-${String(i + 1).padStart(2, "0")}`,
    sets: list,
  }));
  const stats = sessions.map((x) => sessionStats(x, exercise.equipment, []));
  const suggestion = suggestNext(sessions, stats, exercise);
  return { suggestion, text: suggestionText(suggestion, exercise.equipment) };
}

describe("suggestNext (§6.5, ADR 0006)", () => {
  it("règle 1 : aucune séance précédente", () => {
    expect(run([])).toEqual({
      suggestion: { rule: "first" },
      text: "Première fois : choisis une charge confortable.",
    });
    // Une séance sans série de travail ne compte pas.
    expect(run([[s(20, 0), s(10, 8, true)]]).suggestion).toEqual({ rule: "first" });
  });

  it("règle 2 : max estimé en baisse deux séances de suite", () => {
    // maxima : 30 × 1 = 30 ; 29 × 1 = 29 ; 28 × 1 = 28
    const { suggestion, text } = run([[s(30, 1)], [s(29, 1)], [s(28, 1), s(28, 1)]]);
    expect(suggestion).toEqual({ rule: "declining", weightKg: 28, reps: 1 });
    expect(text).toBe(
      "Ton max estimé baisse depuis 2 séances : garde la charge et regarde ta récupération et ton alimentation.",
    );
  });

  it("une seule baisse ne déclenche pas la règle 2", () => {
    expect(run([[s(29, 1)], [s(30, 1)], [s(28, 1)]]).suggestion.rule).toBe("add-rep");
  });

  it("règle 3 : toutes les séries retenues en haut de la fourchette", () => {
    const { suggestion, text } = run([[s(22.5, 10), s(22.5, 10), s(22.5, 11)]]);
    expect(suggestion).toEqual({
      rule: "top-of-range",
      weightKg: 25,
      reps: 6,
      done: { sets: 3, reps: 10, weightKg: 22.5 },
    });
    expect(text).toBe("Tu as fait 3 × 10 à 22,5 kg, le haut de ta fourchette : passe à 25 kg.");
  });

  it("règle 4 : une répétition de plus sur la charge de référence seulement", () => {
    const { suggestion, text } = run([[s(25, 3), s(20, 12)]]);
    expect(suggestion).toEqual({
      rule: "add-rep",
      weightKg: 25,
      reps: 4,
      done: { weightKg: 25, reps: 3 },
    });
    expect(text).toBe("Tu as fait 25 × 3 : vise 25 × 4.");
  });

  it("règle 4 plafonnée au haut de la fourchette (choix 2 du plan)", () => {
    const { suggestion, text } = run([[s(25, 10), s(25, 8)]]);
    expect(suggestion).toMatchObject({ rule: "add-rep", weightKg: 25, reps: 10 });
    expect(text).toBe("Tu as fait 25 × 10 : refais 25 × 10 sur toutes tes séries.");
  });

  it("ignore les anciennes séries d'échauffement et les séries à 0 répétition", () => {
    const { suggestion } = run([[s(30, 2, true), s(30, 0), s(22.5, 10), s(22.5, 10)]]);
    expect(suggestion).toMatchObject({ rule: "top-of-range", weightKg: 25 });
  });

  it("au poids du corps sans pesée, avance sur le lest", () => {
    const top = run([[s(0, 12), s(0, 12), s(0, 12)]], pullUp);
    expect(top.suggestion).toMatchObject({ rule: "top-of-range", weightKg: 2.5, reps: 8 });
    expect(top.text).toBe(
      "Tu as fait 3 × 12 au poids du corps, le haut de ta fourchette : passe à poids du corps + 2,5 kg.",
    );
    const more = run([[s(0, 8)]], pullUp);
    expect(more.text).toBe("Tu as fait poids du corps × 8 : vise poids du corps × 9.");
    // Sans max estimé, la règle 2 ne s'applique jamais.
    expect(run([[s(0, 12)], [s(0, 10)], [s(0, 8)]], pullUp).suggestion.rule).toBe("add-rep");
  });
});

describe("loadLabel et targetLabel", () => {
  it("formatent la charge selon le matériel", () => {
    expect(loadLabel("barbell", 22.5)).toBe("22,5 kg");
    expect(loadLabel("bodyweight", 0)).toBe("poids du corps");
    expect(loadLabel("bodyweight", 5)).toBe("poids du corps + 5 kg");
    expect(
      targetLabel(
        { rule: "add-rep", weightKg: 25, reps: 4, done: { weightKg: 25, reps: 3 } },
        "barbell",
      ),
    ).toBe("25 kg × 4");
    expect(targetLabel({ rule: "first" }, "barbell")).toBeNull();
  });
});
