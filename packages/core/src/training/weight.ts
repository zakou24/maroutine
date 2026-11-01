// Moyenne glissante du poids (architecture.md §6.6) et couloir du poids (§6.9, D22).

import { addDays } from "../dates/calendar";
import type { BodyWeight } from "../schemas/body-weight";

const WINDOW_DAYS = 7;
const MIN_WEIGH_INS = 3;

export type WeightPoint = {
  date: string;
  weightKg: number | null;
  // Moyenne des pesées de J-6 à J s'il y en a au moins 3 ; sinon la courbe s'interrompt.
  average: number | null;
  low: number | null;
  high: number | null;
};

// Un point par jour de `from` à `to` ; la fenêtre de 7 jours lit aussi les pesées d'avant `from`.
export function weightSeries(weighIns: BodyWeight[], from: string, to: string): WeightPoint[] {
  const byDate = new Map(weighIns.map((w) => [w.date, w.weightKg]));
  const points: WeightPoint[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const window: number[] = [];
    for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
      const kg = byDate.get(addDays(day, -i));
      if (kg !== undefined) window.push(kg);
    }
    const enough = window.length >= MIN_WEIGH_INS;
    points.push({
      date: day,
      weightKg: byDate.get(day) ?? null,
      average: enough ? window.reduce((a, b) => a + b, 0) / window.length : null,
      low: enough ? Math.min(...window) : null,
      high: enough ? Math.max(...window) : null,
    });
  }
  return points;
}

// 78.4 → « 78,4 », 80 → « 80,0 ».
export function formatWeight(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

const round1 = (value: number) => Math.round(value * 10) / 10;

// Tendance du poids (Lot 5) : moyenne glissante du jour moins celle d'il y a `days` jours ;
// null si l'une des deux manque (moins de 3 pesées dans sa fenêtre).
export function weightChange(weighIns: BodyWeight[], today: string, days = 7): number | null {
  const now = weightSeries(weighIns, today, today)[0]?.average ?? null;
  const before = weightSeries(weighIns, addDays(today, -days), addDays(today, -days))[0]?.average;
  if (now === null || before === null || before === undefined) return null;
  return now - before;
}

export function weightChangeText(change: number): string {
  // L'écart brut décide : 0,05 kg reste « stable » même s'il s'arrondit à 0,1.
  if (Math.abs(change) < 0.1) return "stable sur 7 jours";
  const rounded = round1(change);
  return `${rounded > 0 ? "+" : "−"}${formatWeight(Math.abs(rounded))} kg en 7 jours`;
}
