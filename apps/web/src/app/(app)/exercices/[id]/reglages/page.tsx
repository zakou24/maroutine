import type { Metadata } from "next";
import { ExerciseSettings } from "./exercise-settings";

export const metadata: Metadata = { title: "Réglages de l'exercice · MaRoutine" };

export default function ExerciseSettingsPage() {
  return <ExerciseSettings />;
}
