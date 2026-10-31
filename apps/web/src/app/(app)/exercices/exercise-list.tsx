"use client";

import { equipmentLabel, type Exercise } from "@maroutine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { LoadError, Loading } from "@/components/query-state";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

export function exercisesQuery(filter: "active" | "archived") {
  return {
    queryKey: ["exercises", filter],
    queryFn: () => apiFetch<Exercise[]>(`/api/v1/exercises?filter=${filter}`),
  };
}

function summary(exercise: Exercise) {
  return `${equipmentLabel(exercise.equipment)} · ${exercise.repMin}–${exercise.repMax} rép.`;
}

export function ExerciseList() {
  const active = useQuery(exercisesQuery("active"));
  const archived = useQuery(exercisesQuery("archived"));
  const queryClient = useQueryClient();
  const restore = useMutation({
    mutationFn: (id: string) =>
      apiFetch<Exercise>(`/api/v1/exercises/${id}`, { method: "PATCH", body: { archived: false } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["exercises"] }),
  });

  if (active.isPending) return <Loading />;
  if (active.isError) {
    return (
      <LoadError message="Impossible de charger les exercices." onRetry={() => active.refetch()} />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {active.data.length === 0 ? (
        <p className="text-[17px] text-muted-foreground">
          Aucun exercice pour l&apos;instant. Crée le premier : il servira dans la saisie du soir.
        </p>
      ) : (
        <ul className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-surface">
          {active.data.map((exercise) => (
            <li key={exercise.id}>
              <Link
                href={`/exercices/${exercise.id}`}
                className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-muted"
              >
                <span className="flex flex-1 flex-col">
                  <span className="text-[17px] font-bold">{exercise.name}</span>
                  <span className="text-[15px] text-muted-foreground">{summary(exercise)}</span>
                </span>
                <ChevronRight
                  aria-hidden
                  className="size-5 text-muted-foreground"
                  strokeWidth={2}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {archived.data && archived.data.length > 0 ? (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-[15px] text-muted-foreground">
            <ChevronRight
              aria-hidden
              className="size-4 transition-transform group-open:rotate-90"
              strokeWidth={2}
            />
            Archivés ({archived.data.length})
          </summary>
          <ul className="mt-2 divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-surface">
            {archived.data.map((exercise) => (
              <li key={exercise.id} className="flex min-h-16 items-center gap-3 px-4 py-2">
                <span className="flex flex-1 flex-col">
                  <span className="text-[17px]">{exercise.name}</span>
                  <span className="text-[15px] text-muted-foreground">{summary(exercise)}</span>
                </span>
                <Button
                  variant="outline"
                  className="h-11 rounded-lg px-4 text-[15px]"
                  aria-label={`Restaurer ${exercise.name}`}
                  disabled={restore.isPending}
                  onClick={() => restore.mutate(exercise.id)}
                >
                  Restaurer
                </Button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
