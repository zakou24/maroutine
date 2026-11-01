"use client";

import { MEALS, addDays, mealLabel, type Meal } from "@maroutine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState, type FormEvent } from "react";
import { FormError } from "@/components/form-error";
import {
  fieldClass,
  labelClass,
  secondaryButtonClass,
  selectClass,
} from "@/components/form-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { countLabel } from "@/lib/format";
import { invalidateJournal } from "@/lib/nutrition-queries";

// « Copier depuis » (F-ALI-7, D26) : une journée ou un repas d'un autre jour, dans les mêmes repas.
export function CopyForm({ date }: { date: string }) {
  const queryClient = useQueryClient();
  const id = useId();
  const [shownDate, setShownDate] = useState(date);
  const [fromDate, setFromDate] = useState(addDays(date, -1));
  const [meal, setMeal] = useState<Meal | "">("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Un autre jour affiché : on repart de sa veille.
  if (shownDate !== date) {
    setShownDate(date);
    setFromDate(addDays(date, -1));
    setStatus(null);
    setError(null);
  }
  const copy = useMutation({
    mutationFn: () =>
      apiFetch<{ created: number }>("/api/v1/food-entries/copy", {
        method: "POST",
        body: { fromDate, toDate: date, ...(meal ? { meal } : {}) },
      }),
    onSuccess: async ({ created }) => {
      setStatus(
        created === 0
          ? "Rien à copier ce jour-là."
          : `${countLabel(created, "entrée copiée", "entrées copiées")}.`,
      );
      await invalidateJournal(queryClient);
    },
    onError: () => setError("Copie impossible. Réessaie."),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    if (!fromDate || fromDate === date) return setError("Choisis un autre jour.");
    setError(null);
    copy.mutate();
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-3 border-t border-rule pt-5"
    >
      <h2 id={`${id}-title`} className="text-[17px] font-bold">
        Copier depuis
      </h2>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-date`} className={labelClass}>
            Jour
          </Label>
          <Input
            id={`${id}-date`}
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className={`${fieldClass} w-44`}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-meal`} className={labelClass}>
            Quoi
          </Label>
          <select
            id={`${id}-meal`}
            value={meal}
            onChange={(e) => setMeal(e.target.value as Meal | "")}
            className={selectClass}
          >
            <option value="">Toute la journée</option>
            {MEALS.map((m) => (
              <option key={m} value={m}>
                {mealLabel(m)}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="submit"
          disabled={copy.isPending}
          className={secondaryButtonClass}
          variant="outline"
        >
          Copier
        </Button>
      </div>
      <FormError>{error}</FormError>
      <p role="status" className="text-[15px] text-corridor-ink empty:hidden">
        {status}
      </p>
    </form>
  );
}
