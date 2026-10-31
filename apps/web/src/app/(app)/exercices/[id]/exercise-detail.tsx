"use client";

import type { Exercise } from "@maroutine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/form-error";
import { secondaryButtonClass } from "@/components/form-styles";
import { Page } from "@/components/page";
import { LoadError, Loading } from "@/components/query-state";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api";
import { ExerciseForm } from "../exercise-form";

export function ExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const exercise = useQuery({
    queryKey: ["exercise", id],
    queryFn: () => apiFetch<Exercise>(`/api/v1/exercises/${id}`),
  });
  const archive = useMutation({
    mutationFn: (archived: boolean) =>
      apiFetch<Exercise>(`/api/v1/exercises/${id}`, { method: "PATCH", body: { archived } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["exercises"] });
      await queryClient.invalidateQueries({ queryKey: ["exercise", id] });
      router.push("/exercices");
    },
    onError: () => setError("Modification impossible. Réessaie."),
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

  const data = exercise.data;
  return (
    <Page title={data.name}>
      <ExerciseForm initial={data} onSaved={() => router.push("/exercices")} />
      <section className="mt-4 flex flex-col items-start gap-3 border-t border-rule pt-6">
        <p className="text-[15px] text-muted-foreground">
          {data.archived
            ? "Cet exercice est archivé : il n'est plus proposé dans la saisie."
            : "Archiver retire l'exercice de la saisie. Il reste dans tes séances passées."}
        </p>
        <Button
          variant="outline"
          className={secondaryButtonClass}
          disabled={archive.isPending}
          onClick={() => archive.mutate(!data.archived)}
        >
          {data.archived ? "Restaurer" : "Archiver"}
        </Button>
        <FormError>{error}</FormError>
      </section>
    </Page>
  );
}
