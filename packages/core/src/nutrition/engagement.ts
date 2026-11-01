// Jour engagé (architecture.md §6.7) et fenêtre alimentaire d'une séance (§6.8).

import { addDays } from "../dates/calendar";

export type DayStatus = "unrecorded" | "unrated" | "engaged" | "notEngaged";

export type WindowStatus = "engaged" | "notEngaged";

const LABELS: Record<DayStatus, string> = {
  unrecorded: "Non renseigné",
  unrated: "Non évalué",
  engaged: "Engagé",
  notEngaged: "Non engagé",
};

export function dayStatusLabel(status: DayStatus): string {
  return LABELS[status];
}

// Bornes incluses, comparées en dixièmes pour éviter les arrondis de 0,9 × l'objectif.
export function dayStatus(
  day: { kcal: number; proteinG: number; entryCount: number },
  target: { kcal: number; proteinG: number } | null,
): DayStatus {
  if (day.entryCount === 0) return "unrecorded";
  if (!target) return "unrated";
  const kcalOk = day.kcal * 10 >= target.kcal * 9 && day.kcal * 10 <= target.kcal * 11;
  const proteinOk = day.proteinG * 10 >= target.proteinG * 9;
  return kcalOk && proteinOk ? "engaged" : "notEngaged";
}

const WINDOW_DAYS = 3;
const MIN_CLASSIFIED = 2;

// J-3, J-2 et J-1 d'une séance du jour J.
export function windowDays(sessionDate: string): string[] {
  return Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(sessionDate, i - WINDOW_DAYS));
}

// Classée avec au moins 2 jours engagés ou non engagés ; engagée si au moins 2/3 de ceux-là le sont.
export function windowStatus(statuses: DayStatus[]): WindowStatus | null {
  const classified = statuses.filter((s) => s === "engaged" || s === "notEngaged");
  if (classified.length < MIN_CLASSIFIED) return null;
  const engaged = classified.filter((s) => s === "engaged").length;
  return engaged * 3 >= classified.length * 2 ? "engaged" : "notEngaged";
}
