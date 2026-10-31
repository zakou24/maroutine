import type { Metadata } from "next";
import { ExerciseDetail } from "./exercise-detail";

export const metadata: Metadata = { title: "Exercice · MaRoutine" };

// L'identifiant est lu côté client (useParams) : la page reste une coquille statique.
export default function ExercisePage() {
  return <ExerciseDetail />;
}
