// Tendance d'un exercice (architecture.md §6.4) et couloir de tendance des courbes (§6.9).

import { daysBetween } from "../dates/calendar";
import type { SessionStats } from "./stats";

export type Trend = "progressing" | "stalling" | "regressing" | "inactive" | "insufficient";

const TREND_SESSIONS = 6;
const INACTIVE_AFTER_DAYS = 30;
const THRESHOLD = 0.01;
// Le couloir couvre les maxima des 3 dernières séances (D18).
const CORRIDOR_SESSIONS = 3;

const LABELS: Record<Trend, string> = {
  progressing: "En progression",
  stalling: "En stagnation",
  regressing: "En régression",
  inactive: "Inactif",
  insufficient: "Pas assez de données",
};

export function trendLabel(trend: Trend): string {
  return LABELS[trend];
}

type WithMax = SessionStats & { estimatedMax: number };

function withMax(stats: SessionStats[]): WithMax[] {
  return stats.filter((s): s is WithMax => s.estimatedMax !== null);
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

// `stats` dans l'ordre chronologique ; seules les séances ayant un max estimé comptent.
export function exerciseTrend(stats: SessionStats[], today: string): Trend {
  const last = withMax(stats).slice(-TREND_SESSIONS);
  if (last.length < TREND_SESSIONS) return "insufficient";
  if (daysBetween(last.at(-1)!.performedOn, today) > INACTIVE_AFTER_DAYS) return "inactive";
  const values = last.map((s) => s.estimatedMax);
  const before = mean(values.slice(0, 3));
  const delta = (mean(values.slice(3)) - before) / before;
  if (delta > THRESHOLD) return "progressing";
  if (delta < -THRESHOLD) return "regressing";
  return "stalling";
}

export type CorridorPoint = {
  workoutId: string;
  performedOn: string;
  value: number;
  low: number;
  high: number;
};

export function trendCorridor(stats: SessionStats[]): CorridorPoint[] {
  const points = withMax(stats);
  return points.map((s, i) => {
    const window = points
      .slice(Math.max(0, i - CORRIDOR_SESSIONS + 1), i + 1)
      .map((p) => p.estimatedMax);
    return {
      workoutId: s.workoutId,
      performedOn: s.performedOn,
      value: s.estimatedMax,
      low: Math.min(...window),
      high: Math.max(...window),
    };
  });
}
