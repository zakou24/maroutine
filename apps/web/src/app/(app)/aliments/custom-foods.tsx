"use client";

import type { Food } from "@maroutine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { FoodForm } from "@/components/food-form";
import { FormError } from "@/components/form-error";
import { LoadError, Loading } from "@/components/query-state";
import { apiFetch } from "@/lib/api";
import { formatGrams, formatKcal } from "@/lib/format";

const iconButton =
  "flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground";

// Aliments perso (F-ALI-2) : les supprimer laisse les entrées passées intactes (valeurs figées).
export function CustomFoods() {
  const id = useId();
  const queryClient = useQueryClient();
  const foods = useQuery({
    queryKey: ["foods-custom"],
    queryFn: () => apiFetch<Food[]>("/api/v1/foods"),
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const remove = useMutation({
    mutationFn: (foodId: string) => apiFetch<void>(`/api/v1/foods/${foodId}`, { method: "DELETE" }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["foods-custom"] });
      await queryClient.invalidateQueries({ queryKey: ["foods-recent"] });
    },
    onError: () => setError("Suppression impossible. Réessaie."),
  });

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby={`${id}-new`} className="flex flex-col gap-3">
        <h2 id={`${id}-new`} className="text-[20px] leading-7 font-bold">
          Nouvel aliment perso
        </h2>
        <FoodForm
          key={formKey}
          submitLabel="Créer l'aliment"
          onSaved={() => setFormKey((k) => k + 1)}
        />
      </section>
      <section aria-labelledby={`${id}-list`} className="flex flex-col gap-3">
        <h2 id={`${id}-list`} className="text-[20px] leading-7 font-bold">
          Mes aliments
        </h2>
        <p className="text-[15px] text-muted-foreground">
          Valeurs pour 100 g. Modifier ou supprimer un aliment ne change pas les repas déjà notés.
        </p>
        <FormError>{error}</FormError>
        {foods.isPending ? (
          <Loading />
        ) : foods.isError ? (
          <LoadError
            message="Impossible de charger tes aliments."
            onRetry={() => foods.refetch()}
          />
        ) : foods.data.length === 0 ? (
          <p className="text-[17px] text-muted-foreground">
            Aucun aliment perso pour l&apos;instant.
          </p>
        ) : (
          <ul
            aria-labelledby={`${id}-list`}
            className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-surface"
          >
            {foods.data.map((food) =>
              editing === food.id ? (
                <li key={food.id} className="px-4 py-3">
                  <FoodForm
                    initial={food}
                    submitLabel="Enregistrer"
                    onSaved={() => setEditing(null)}
                  />
                </li>
              ) : (
                <li key={food.id} className="flex min-h-14 items-center gap-1 py-2 pr-1 pl-4">
                  <span className="flex flex-1 flex-col">
                    <span className="text-[17px]">{food.name}</span>
                    <span className="text-[15px] text-muted-foreground tabular-nums">
                      {formatKcal(food.kcalPer100g)} · {formatGrams(food.proteinPer100g)} de
                      protéines
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Modifier ${food.name}`}
                    onClick={() => setEditing(food.id)}
                    className={iconButton}
                  >
                    <Pencil aria-hidden className="size-5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Supprimer ${food.name}`}
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(food.id)}
                    className={iconButton}
                  >
                    <Trash2 aria-hidden className="size-5" strokeWidth={2} />
                  </button>
                </li>
              ),
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
