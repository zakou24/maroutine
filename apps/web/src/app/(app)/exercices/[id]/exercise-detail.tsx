"use client";

import type { Exercise } from "@maroutine/core";
import { useQuery } from "@tanstack/react-query";
import { Settings } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Page } from "@/components/page";
import { LoadError, Loading } from "@/components/query-state";
import { ApiError, apiFetch } from "@/lib/api";
import { ExerciseStats } from "./exercise-stats";

// Fiche exercice (F-STA-2) : les stats ; les réglages sont sur /exercices/[id]/reglages.
export function ExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const exercise = useQuery({
    queryKey: ["exercise", id],
    queryFn: () => apiFetch<Exercise>(`/api/v1/exercises/${id}`),
  });

  if (exercise.isPending) {
    return (
      <Page title="Exercice">
        <Loading />
      </Page>
    );
  }
  if (exercise.isError) {
    const missing = exercise.error instanceof ApiError && exercise.error.status === 404;
    return (
      <Page title="Exercice">
        {missing ? (
          <p className="text-[17px] text-muted-foreground">
            Cet exercice n&apos;existe pas.{" "}
            <Link href="/exercices" className="text-action underline underline-offset-4">
              Retour aux exercices
            </Link>
          </p>
        ) : (
          <LoadError
            message="Impossible de charger l'exercice."
            onRetry={() => exercise.refetch()}
          />
        )}
      </Page>
    );
  }

  return (
    <Page
      title={exercise.data.name}
      action={
        <Link
          href={`/exercices/${id}/reglages`}
          className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-[15px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Settings aria-hidden className="size-5" strokeWidth={2} />
          Réglages
        </Link>
      }
    >
      <ExerciseStats exercise={exercise.data} />
    </Page>
  );
}
