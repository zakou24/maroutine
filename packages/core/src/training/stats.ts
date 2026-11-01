// Stats d'un exercice dans une séance (architecture.md §6.1 à §6.3).

import { addDays, addMonthsToDate } from "../dates/calendar";
import type { Equipment } from "./equipment";

export type HistorySet = { weightKg: number; reps: number; isWarmup: boolean };

// Une séance d'un exercice, avec ses séries dans l'ordre de saisie ; les listes sont chronologiques.
export type ExerciseSession = { workoutId: string; performedOn: string; sets: HistorySet[] };

export type WeighIn = { date: string; kg: number };

export type SessionStats = {
  workoutId: string;
  performedOn: string;
  estimatedMax: number | null;
  approximate: boolean;
  // Telle que saisie : pour le poids du corps, la charge est le lest.
  bestSet: { weightKg: number; reps: number } | null;
  volumeKg: number | null;
  workingSetCount: number;
};

export type Period = "1m" | "3m" | "1y" | "all";

export const PERIODS: readonly Period[] = ["1m", "3m", "1y", "all"];

// Au-delà, le max estimé est « approximatif » (F-STA-5).
const APPROXIMATE_ABOVE_REPS = 12;
// Une pesée sert au poids du corps jusqu'à 14 jours après (C5).
const WEIGH_IN_VALIDITY_DAYS = 14;

// Les anciennes séries d'échauffement (avant D14) et les séries à 0 répétition ne comptent pas.
export function isWorkingSet(set: HistorySet): boolean {
  return !set.isWarmup && set.reps >= 1;
}

// Formule d'Epley (ADR 0005), en valeur brute : l'arrondi se fait à l'affichage.
export function estimatedMax(weightKg: number, reps: number): number {
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

// Dernière pesée datée de J-14 à J, jour même compris.
export function bodyWeightOn(date: string, weighIns: WeighIn[]): number | null {
  const from = addDays(date, -WEIGH_IN_VALIDITY_DAYS);
  let latest: WeighIn | null = null;
  for (const w of weighIns) {
    if (w.date < from || w.date > date) continue;
    if (!latest || w.date > latest.date) latest = w;
  }
  return latest?.kg ?? null;
}

export function sessionStats(
  session: ExerciseSession,
  equipment: Equipment,
  weighIns: WeighIn[],
): SessionStats {
  const working = session.sets.filter(isWorkingSet);
  const base = {
    workoutId: session.workoutId,
    performedOn: session.performedOn,
    workingSetCount: working.length,
  };
  if (working.length === 0) {
    return { ...base, estimatedMax: null, approximate: false, bestSet: null, volumeKg: null };
  }

  const bodyWeight = equipment === "bodyweight" ? bodyWeightOn(session.performedOn, weighIns) : 0;
  if (bodyWeight === null) {
    // Charge effective inconnue : la stat principale devient la meilleure série en répétitions.
    const best = working.reduce((a, b) =>
      b.reps > a.reps || (b.reps === a.reps && b.weightKg > a.weightKg) ? b : a,
    );
    return {
      ...base,
      estimatedMax: null,
      approximate: false,
      bestSet: { weightKg: best.weightKg, reps: best.reps },
      volumeKg: null,
    };
  }

  let best = working[0]!;
  let bestMax = estimatedMax(best.weightKg + bodyWeight, best.reps);
  let volumeKg = 0;
  for (const set of working) {
    const load = set.weightKg + bodyWeight;
    volumeKg += load * set.reps;
    const max = estimatedMax(load, set.reps);
    if (max > bestMax || (max === bestMax && set.weightKg > best.weightKg)) {
      best = set;
      bestMax = max;
    }
  }
  return {
    ...base,
    estimatedMax: bestMax,
    approximate: best.reps > APPROXIMATE_ABOVE_REPS,
    bestSet: { weightKg: best.weightKg, reps: best.reps },
    volumeKg,
  };
}

const PERIOD_MONTHS: Record<Exclude<Period, "all">, number> = { "1m": 1, "3m": 3, "1y": 12 };

// Premier jour affiché pour une période ; null pour « Tout ».
export function periodStart(today: string, period: Period): string | null {
  return period === "all" ? null : addMonthsToDate(today, -PERIOD_MONTHS[period]);
}
