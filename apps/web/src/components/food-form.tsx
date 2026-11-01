"use client";

import { parseDecimal, type Food, type FoodInput } from "@maroutine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState, type FormEvent } from "react";
import { Field } from "@/app/(app)/alimentation/journal-screen";
import { FormError } from "@/components/form-error";
import { secondaryButtonClass } from "@/components/form-styles";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

const fmt = (n: number) => String(n).replace(".", ",");

// Aliment perso (F-ALI-2) : création ou modification, valeurs pour 100 g.
export function FoodForm({
  initial,
  submitLabel,
  onSaved,
}: {
  initial?: Food;
  submitLabel: string;
  onSaved: (food: Food) => void;
}) {
  const queryClient = useQueryClient();
  const id = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [kcal, setKcal] = useState(initial ? fmt(initial.kcalPer100g) : "");
  const [protein, setProtein] = useState(initial ? fmt(initial.proteinPer100g) : "");
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: (body: FoodInput) =>
      initial
        ? apiFetch<Food>(`/api/v1/foods/${initial.id}`, { method: "PATCH", body })
        : apiFetch<Food>("/api/v1/foods", { method: "POST", body }),
    onSuccess: async (food) => {
      await queryClient.invalidateQueries({ queryKey: ["foods-custom"] });
      onSaved(food);
    },
    onError: () => setError("Enregistrement impossible. Réessaie."),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const k = parseDecimal(kcal);
    const p = parseDecimal(protein);
    if (!name.trim()) return setError("Donne un nom à l'aliment.");
    if (k === null || k > 900) return setError("Les calories vont de 0 à 900 pour 100 g.");
    if (p === null || p > 100) return setError("Les protéines vont de 0 à 100 g pour 100 g.");
    setError(null);
    save.mutate({ name: name.trim(), kcalPer100g: k, proteinPer100g: p });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <Field id={`${id}-name`} label="Nom" value={name} onChange={setName} wide />
        <Field
          id={`${id}-kcal`}
          label="Calories pour 100 g"
          value={kcal}
          onChange={setKcal}
          numeric
        />
        <Field
          id={`${id}-prot`}
          label="Protéines pour 100 g"
          value={protein}
          onChange={setProtein}
          numeric
        />
      </div>
      <FormError>{error}</FormError>
      <Button
        type="submit"
        disabled={save.isPending}
        className={`${secondaryButtonClass} self-start`}
      >
        {submitLabel}
      </Button>
    </form>
  );
}
