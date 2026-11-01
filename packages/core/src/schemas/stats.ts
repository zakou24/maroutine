import { z } from "zod";
import { PERIODS, type SessionStats } from "../training/stats";
import type { Suggestion } from "../training/suggestion";
import type { CorridorPoint, Trend } from "../training/trend";

export const periodSchema = z.enum(PERIODS).default("3m");

// GET /api/v1/exercises/{id}/stats : tendance et dernière séance sur tout l'historique, le reste sur la période.
export type ExerciseStatsResponse = {
  trend: Trend;
  latest: SessionStats | null;
  sessions: SessionStats[];
  corridor: CorridorPoint[];
};

// GET /api/v1/exercises/{id}/suggestion
export type SuggestionResponse = { suggestion: Suggestion; text: string };

// GET /api/v1/exercises/trends
export type ExerciseTrendSummary = {
  exerciseId: string;
  trend: Trend;
  latestMax: number | null;
  approximate: boolean;
};
