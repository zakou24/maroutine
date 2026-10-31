"use client";

import { useParams } from "next/navigation";
import { WorkoutEditor } from "../workout-editor";

export function WorkoutPage() {
  const { id } = useParams<{ id: string }>();
  return <WorkoutEditor mode="edit" workoutId={id} />;
}
