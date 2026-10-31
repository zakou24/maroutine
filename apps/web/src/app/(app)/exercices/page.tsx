import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@/components/page";
import { ExerciseList } from "./exercise-list";

export const metadata: Metadata = { title: "Exercices · MaRoutine" };

export default function ExercisesPage() {
  return (
    <Page
      title="Exercices"
      action={
        <Link
          href="/exercices/nouveau"
          className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-action px-4 text-[15px] font-bold text-white hover:bg-action-strong"
        >
          <Plus aria-hidden className="size-5" strokeWidth={2} />
          Nouvel exercice
        </Link>
      }
    >
      <ExerciseList />
    </Page>
  );
}
