import type { Metadata } from "next";
import { WorkoutEditor } from "../seances/workout-editor";

export const metadata: Metadata = { title: "Séance du soir · MaRoutine" };

export default function EveningEntryPage() {
  return <WorkoutEditor mode="create" />;
}
