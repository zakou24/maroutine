"use client";

import {
  EXERCISE_CATALOG,
  MUSCLE_GROUPS,
  equipmentLabel,
  muscleGroupLabel,
  type Exercise,
} from "@maroutine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/form-error";
import { primaryButtonClass } from "@/components/form-styles";
import { LoadError, Loading } from "@/components/query-state";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

// Ajout de plusieurs exercices courants d'un coup (D16). Ceux déjà créés, quelle que soit la casse,
// apparaissent cochés et grisés.
export function CatalogPicker() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const exercises = useQuery({
    queryKey: ["exercises", "all"],
    queryFn: () => apiFetch<Exercise[]>("/api/v1/exercises?filter=all"),
  });
  const add = useMutation({
    mutationFn: (names: Set<string>) =>
      apiFetch("/api/v1/exercises/batch", {
        method: "POST",
        body: {
          exercises: EXERCISE_CATALOG.filter((e) => names.has(e.name)).map((e) => ({
            name: e.name,
            equipment: e.equipment,
          })),
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["exercises"] });
      router.push("/exercices");
    },
    onError: () => setError("Ajout impossible. Réessaie."),
  });

  if (exercises.isPending) return <Loading />;
  if (exercises.isError) {
    return (
      <LoadError
        message="Impossible de charger tes exercices."
        onRetry={() => exercises.refetch()}
      />
    );
  }

  const known = new Set(exercises.data.map((e) => e.name.toLowerCase()));
  function toggle(name: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[17px] text-muted-foreground">
        Coche les exercices que tu fais. Tu pourras les renommer ou les régler ensuite.
      </p>
      {MUSCLE_GROUPS.map((group) => (
        <fieldset key={group} className="flex flex-col gap-2">
          <legend className="mb-2 text-[17px] font-bold">{muscleGroupLabel(group)}</legend>
          <ul className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-surface">
            {EXERCISE_CATALOG.filter((e) => e.group === group).map((entry) => {
              const already = known.has(entry.name.toLowerCase());
              return (
                <li key={entry.name}>
                  <label
                    className={cn(
                      "flex min-h-14 items-center gap-3 px-4 py-2",
                      already ? "text-muted-foreground" : "cursor-pointer hover:bg-muted",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="check shrink-0"
                      aria-label={already ? `${entry.name} (déjà ajouté)` : entry.name}
                      checked={already || selected.has(entry.name)}
                      disabled={already}
                      onChange={() => toggle(entry.name)}
                    />
                    <span className="flex flex-1 flex-col">
                      <span className="text-[17px]">{entry.name}</span>
                      <span className="text-[15px] text-muted-foreground">
                        {already ? "Déjà ajouté" : equipmentLabel(entry.equipment)}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}

      <div className="sticky bottom-[calc(52px+env(safe-area-inset-bottom))] -mx-4 flex flex-col gap-2 border-t border-rule bg-background px-4 pt-3 pb-3 sm:-mx-6 sm:px-6 md:bottom-0 md:mx-0 md:px-0">
        <FormError>{error}</FormError>
        <Button
          className={primaryButtonClass}
          disabled={selected.size === 0 || add.isPending}
          onClick={() => {
            setError(null);
            add.mutate(selected);
          }}
        >
          {add.isPending ? "Ajout…" : selected.size > 0 ? `Ajouter (${selected.size})` : "Ajouter"}
        </Button>
      </div>
    </div>
  );
}
