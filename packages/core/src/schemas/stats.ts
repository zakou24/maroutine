import { z } from "zod";
import type { DayStatus } from "../nutrition/engagement";
import type { Crossing } from "../training/crossing";
import type { Equipment } from "../training/equipment";
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

// GET /api/v1/nutrition/days?from&to : un élément par jour, jours vides compris (§6.7).
export type NutritionDay = {
  date: string;
  kcal: number;
  proteinG: number;
  entryCount: number;
  target: { kcal: number; proteinG: number } | null;
  status: DayStatus;
};

// GET /api/v1/stats/crossing (F-TDB-3, F-TDB-4)
export type CrossingResponse = {
  all: Crossing;
  byExercise: { exerciseId: string; name: string; crossing: Crossing }[];
};

// GET /api/v1/stats/next : suggestions des exercices de la dernière séance (F-TDB-1).
export type NextSuggestions = {
  workoutId: string | null;
  performedOn: string | null;
  items: {
    exerciseId: string;
    name: string;
    equipment: Equipment;
    suggestion: Suggestion;
    text: string;
  }[];
};
