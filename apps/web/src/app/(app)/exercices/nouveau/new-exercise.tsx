"use client";

import { useRouter } from "next/navigation";
import { ExerciseForm } from "../exercise-form";

export function NewExercise() {
  const router = useRouter();
  return <ExerciseForm onSaved={() => router.push("/exercices")} />;
}
