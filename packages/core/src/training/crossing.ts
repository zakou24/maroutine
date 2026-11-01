// Progressions du max estimé et croisement avec la fenêtre alimentaire (architecture.md §6.8).

import { daysBetween } from "../dates/calendar";
import type { WindowStatus } from "../nutrition/engagement";
import type { SessionStats } from "./stats";

export type Progression = {
  exerciseId: string;
  workoutId: string;
  performedOn: string;
  change: number;
};

// Une reprise après une coupure fausserait la comparaison.
const MAX_GAP_DAYS = 21;
// Sous 5 séances distinctes dans l'un des groupes, aucun chiffre (F-TDB-4).
const MIN_SESSIONS = 5;

// `stats` dans l'ordre chronologique. P est la séance précédente qui a un max estimé : une séance
// sans max (poids du corps sans pesée) ne coupe pas la chaîne.
export function progressions(exerciseId: string, stats: SessionStats[]): Progression[] {
  const list: Progression[] = [];
  let previous: SessionStats | null = null;
  for (const session of stats) {
    if (session.estimatedMax === null) continue;
    if (
      previous?.estimatedMax &&
      daysBetween(previous.performedOn, session.performedOn) <= MAX_GAP_DAYS
    ) {
      list.push({
        exerciseId,
        workoutId: session.workoutId,
        performedOn: session.performedOn,
        change: (session.estimatedMax - previous.estimatedMax) / previous.estimatedMax,
      });
    }
    previous = session;
  }
  return list;
}

export type CrossingGroup = {
  // Nulle sous le seuil : aucun chiffre de comparaison ne sort (F-TDB-4).
  mean: number | null;
  progressions: number;
  sessions: number;
  missing: number;
};

export type Crossing = { enough: boolean; engaged: CrossingGroup; notEngaged: CrossingGroup };

function group(list: Progression[], enough: boolean): CrossingGroup {
  const sessions = new Set(list.map((p) => p.workoutId)).size;
  return {
    mean: enough && list.length > 0 ? list.reduce((a, p) => a + p.change, 0) / list.length : null,
    progressions: list.length,
    sessions,
    missing: Math.max(0, MIN_SESSIONS - sessions),
  };
}

// Regroupe les progressions selon la fenêtre de leur séance ; une fenêtre non classée est exclue.
export function crossing(
  list: Progression[],
  windowOf: (date: string) => WindowStatus | null,
): Crossing {
  const engaged = list.filter((p) => windowOf(p.performedOn) === "engaged");
  const notEngaged = list.filter((p) => windowOf(p.performedOn) === "notEngaged");
  const sessionsOf = (l: Progression[]) => new Set(l.map((p) => p.workoutId)).size;
  const enough = sessionsOf(engaged) >= MIN_SESSIONS && sessionsOf(notEngaged) >= MIN_SESSIONS;
  return { enough, engaged: group(engaged, enough), notEngaged: group(notEngaged, enough) };
}

// 0.0183 → « +1,8 % », −0.004 → « −0,4 % » ; ce qui s'arrondit à zéro s'écrit « 0,0 % ».
export function formatChange(change: number): string {
  const tenths = Math.round(change * 1000);
  const text = (Math.abs(tenths) / 10).toFixed(1).replace(".", ",");
  if (tenths === 0) return `${text} %`;
  return `${tenths > 0 ? "+" : "−"}${text} %`;
}

function sessionsLabel(count: number) {
  return `${count} ${count > 1 ? "séances" : "séance"}`;
}

// Toujours descriptive (§6.8) : jamais de lien de cause.
export function crossingText(c: Crossing): string {
  const { engaged, notEngaged } = c;
  if (c.enough && engaged.mean !== null && notEngaged.mean !== null) {
    const verb = engaged.mean >= 0 ? "a progressé" : "a évolué";
    return (
      `Après 3 jours bien suivis, ton max estimé ${verb} en moyenne de ${formatChange(engaged.mean)} ` +
      `(${sessionsLabel(engaged.sessions)}), contre ${formatChange(notEngaged.mean)} sinon ` +
      `(${sessionsLabel(notEngaged.sessions)}).`
    );
  }
  const parts: string[] = [];
  if (engaged.missing > 0 && notEngaged.missing > 0) {
    parts.push(
      `${sessionsLabel(engaged.missing)} après des jours bien suivis et ${notEngaged.missing} après les autres`,
    );
  } else if (engaged.missing > 0) {
    parts.push(`${sessionsLabel(engaged.missing)} après des jours bien suivis`);
  } else {
    parts.push(`${sessionsLabel(notEngaged.missing)} après des jours moins bien suivis`);
  }
  return `Pas encore assez de données : il manque ${parts.join("")}.`;
}
