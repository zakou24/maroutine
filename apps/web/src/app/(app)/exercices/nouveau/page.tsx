import type { Metadata } from "next";
import { Page } from "@/components/page";
import { NewExercise } from "./new-exercise";

export const metadata: Metadata = { title: "Nouvel exercice · MaRoutine" };

export default function NewExercisePage() {
  return (
    <Page title="Nouvel exercice">
      <NewExercise />
    </Page>
  );
}
