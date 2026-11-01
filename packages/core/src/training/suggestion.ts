// Suggestion de la prochaine séance (architecture.md §6.5, ADR 0006) : quatre règles, dans l'ordre.

import type { Exercise } from "../schemas/exercise";
import { formatKg } from "../units/decimal";
import type { Equipment } from "./equipment";
import { isWorkingSet, type ExerciseSession, type SessionStats } from "./stats";

export type Suggestion =
  | { rule: "first" }
  | { rule: "declining"; weightKg: number; reps: number }
  | {
      rule: "top-of-range";
      weightKg: number;
      reps: number;
      done: { sets: number; reps: number; weightKg: number };
    }
  | { rule: "add-rep"; weightKg: number; reps: number; done: { weightKg: number; reps: number } };

type Range = Pick<Exercise, "equipment" | "repMin" | "repMax" | "incrementKg">;

// `sessions` et `stats` dans l'ordre chronologique, `stats[i]` calculé sur `sessions[i]`.
export function suggestNext(
  sessions: ExerciseSession[],
  stats: SessionStats[],
  exercise: Range,
): Suggestion {
  const last = sessions.filter((x) => x.sets.some(isWorkingSet)).at(-1);
  if (!last) return { rule: "first" };

  const working = last.sets.filter(isWorkingSet);
  // Charge de référence : la plus grande charge saisie (le lest au poids du corps).
  const weightKg = Math.max(...working.map((x) => x.weightKg));
  const retained = working.filter((x) => x.weightKg === weightKg);
  const first = retained[0]!;

  // La règle 2 ne compte que les séances ayant un max estimé.
  const maxima = stats.flatMap((x) => (x.estimatedMax === null ? [] : [x.estimatedMax]));
  const [m2, m1, m0] = maxima.slice(-3);
  if (maxima.length >= 3 && m0! < m1! && m1! < m2!) {
    return { rule: "declining", weightKg, reps: first.reps };
  }

  if (retained.every((x) => x.reps >= exercise.repMax)) {
    return {
      rule: "top-of-range",
      weightKg: weightKg + exercise.incrementKg,
      reps: exercise.repMin,
      done: { sets: retained.length, reps: Math.min(...retained.map((x) => x.reps)), weightKg },
    };
  }

  return {
    rule: "add-rep",
    weightKg,
    reps: Math.min(first.reps + 1, exercise.repMax),
    done: { weightKg, reps: first.reps },
  };
}

// « 22,5 kg », « poids du corps », « poids du corps + 5 kg ».
export function loadLabel(equipment: Equipment, weightKg: number): string {
  if (equipment !== "bodyweight") return `${formatKg(weightKg)} kg`;
  return weightKg === 0 ? "poids du corps" : `poids du corps + ${formatKg(weightKg)} kg`;
}

// Cible affichée en gras (« 25 kg × 4 ») ; aucune pour une première fois.
export function targetLabel(s: Suggestion, equipment: Equipment): string | null {
  return s.rule === "first" ? null : `${loadLabel(equipment, s.weightKg)} × ${s.reps}`;
}

// Charge sans unité dans « 25 × 3 », comme au cadrage.
function shortLoad(equipment: Equipment, weightKg: number): string {
  return equipment === "bodyweight" ? loadLabel(equipment, weightKg) : formatKg(weightKg);
}

export function suggestionText(s: Suggestion, equipment: Equipment): string {
  switch (s.rule) {
    case "first":
      return "Première fois : choisis une charge confortable.";
    case "declining":
      return "Ton max estimé baisse depuis 2 séances : garde la charge et regarde ta récupération et ton alimentation.";
    case "top-of-range": {
      const load = loadLabel(equipment, s.done.weightKg);
      const at = load.startsWith("poids du corps") ? `au ${load}` : `à ${load}`;
      return `Tu as fait ${s.done.sets} × ${s.done.reps} ${at}, le haut de ta fourchette : passe à ${loadLabel(equipment, s.weightKg)}.`;
    }
    case "add-rep": {
      const done = `${shortLoad(equipment, s.done.weightKg)} × ${s.done.reps}`;
      const next = `${shortLoad(equipment, s.weightKg)} × ${s.reps}`;
      // Première série déjà en haut de la fourchette : il reste à y amener les autres (D19).
      return s.reps === s.done.reps
        ? `Tu as fait ${done} : refais ${next} sur toutes tes séries.`
        : `Tu as fait ${done} : vise ${next}.`;
    }
  }
}
