"use client";

import {
  MAX_WEIGHT_KG,
  MIN_WEIGHT_KG,
  formatWeight,
  isTenthKg,
  parseDecimal,
  type BodyWeight,
} from "@maroutine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState, type FormEvent } from "react";
import { FormError } from "@/components/form-error";
import { fieldClass, labelClass, primaryButtonClass } from "@/components/form-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { invalidateStats } from "@/lib/stats-queries";

const MESSAGES = {
  empty: "Saisis ta pesée en kg, par exemple 78,4.",
  tenth: "La pesée prend une décimale au plus.",
  bounds: `La pesée va de ${MIN_WEIGHT_KG} à ${MAX_WEIGHT_KG} kg.`,
  future: "La date ne peut pas être dans le futur.",
  failed: "Enregistrement impossible. Réessaie.",
};

function validate(text: string): { ok: true; weightKg: number } | { ok: false; message: string } {
  const value = parseDecimal(text);
  if (value === null) return { ok: false, message: MESSAGES.empty };
  if (!isTenthKg(value)) return { ok: false, message: MESSAGES.tenth };
  if (value < MIN_WEIGHT_KG || value > MAX_WEIGHT_KG)
    return { ok: false, message: MESSAGES.bounds };
  return { ok: true, weightKg: value };
}

// Saisie d'une pesée (F-POI-1) : sur l'accueil pour aujourd'hui, sur l'écran Poids à toute date passée.
export function WeightForm({
  today,
  weighIns,
  label = "Pesée (kg)",
  withDate = false,
}: {
  today: string;
  weighIns: BodyWeight[];
  label?: string;
  withDate?: boolean;
}) {
  const queryClient = useQueryClient();
  const id = useId();
  const [date, setDate] = useState(today);
  // L'app reste en mémoire d'un soir à l'autre : au changement de jour, la saisie repart du
  // nouveau jour. Sans ça, la pesée du soir écraserait celle de la veille (revue du Lot 3).
  const [shownToday, setShownToday] = useState(today);
  // null : champ non touché, il montre la pesée déjà notée à cette date.
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  if (shownToday !== today) {
    setShownToday(today);
    setDate(today);
    setText(null);
    setError(null);
    setStatus(null);
  }
  const existing = weighIns.find((w) => w.date === date);
  const value = text ?? (existing ? formatWeight(existing.weightKg) : "");

  const save = useMutation({
    mutationFn: (weightKg: number) =>
      apiFetch<BodyWeight>(`/api/v1/body-weights/${date}`, { method: "PUT", body: { weightKg } }),
    onSuccess: async () => {
      setText(null);
      setStatus("Pesée enregistrée.");
      await queryClient.invalidateQueries({ queryKey: ["body-weights"] });
      // Les exercices au poids du corps dépendent des pesées (C5).
      await invalidateStats(queryClient);
    },
    onError: () => setError(MESSAGES.failed),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    if (date > today) return setError(MESSAGES.future);
    const result = validate(value);
    if (!result.ok) return setError(result.message);
    setError(null);
    save.mutate(result.weightKg);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        {withDate ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-date`} className={labelClass}>
              Date de la pesée
            </Label>
            <Input
              id={`${id}-date`}
              type="date"
              max={today}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setText(null);
                setStatus(null);
              }}
              className={`${fieldClass} w-44`}
            />
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-kg`} className={labelClass}>
            {label}
          </Label>
          <Input
            id={`${id}-kg`}
            inputMode="decimal"
            autoComplete="off"
            value={value}
            onChange={(e) => {
              setText(e.target.value);
              setStatus(null);
            }}
            className={`${fieldClass} w-28 tabular-nums`}
          />
        </div>
        <Button type="submit" disabled={save.isPending} className={primaryButtonClass}>
          {save.isPending ? "Enregistrement…" : existing ? "Remplacer" : "Enregistrer"}
        </Button>
      </div>
      <FormError>{error}</FormError>
      <p role="status" className="text-[15px] text-corridor-ink empty:hidden">
        {status}
      </p>
    </form>
  );
}
