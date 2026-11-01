"use client";

import { targetOn, type NutritionTarget, type NutritionTargetInput } from "@maroutine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState, type FormEvent } from "react";
import { Field } from "@/app/(app)/alimentation/journal-screen";
import { FormError } from "@/components/form-error";
import { fieldClass, labelClass, primaryButtonClass } from "@/components/form-styles";
import { LoadError, Loading } from "@/components/query-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { formatGrams, formatKcal, formatLongDate } from "@/lib/format";
import { targetsQuery } from "@/lib/nutrition-queries";
import { useToday } from "@/lib/use-today";

const int = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text) : null);

// Objectifs avec une date d'effet (C8) : l'historique est gardé, les anciens jours restent jugés
// sur l'objectif de l'époque.
export function TargetsScreen() {
  const today = useToday();
  const targets = useQuery(targetsQuery);
  if (today === null || targets.isPending) return <Loading />;
  if (targets.isError) {
    return (
      <LoadError message="Impossible de charger tes objectifs." onRetry={() => targets.refetch()} />
    );
  }
  const current = targetOn(targets.data, today);
  return (
    <div className="flex flex-col gap-8">
      <TargetForm key={today} today={today} current={current} />
      {targets.data.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-[20px] leading-7 font-bold">Historique</h2>
          <ul
            aria-label="Historique des objectifs"
            className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-surface"
          >
            {targets.data.map((t) => (
              <li key={t.validFrom} className="flex min-h-14 flex-col justify-center px-4 py-2">
                <span className="text-[17px] first-letter:uppercase">
                  À partir du {formatLongDate(t.validFrom)}
                  {t === current ? (
                    <span className="ml-2 rounded-full bg-corridor px-2 py-0.5 text-[13px] font-bold text-corridor-ink">
                      En vigueur
                    </span>
                  ) : null}
                </span>
                <span className="text-[15px] text-muted-foreground tabular-nums">
                  {formatKcal(t.kcal)} · {formatGrams(t.proteinG)} de protéines
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function TargetForm({ today, current }: { today: string; current: NutritionTarget | null }) {
  const id = useId();
  const queryClient = useQueryClient();
  const [validFrom, setValidFrom] = useState(today);
  const [kcal, setKcal] = useState(current ? String(current.kcal) : "");
  const [protein, setProtein] = useState(current ? String(current.proteinG) : "");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: (body: NutritionTargetInput) =>
      apiFetch("/api/v1/nutrition-targets", { method: "POST", body }),
    onSuccess: async () => {
      setStatus("Objectifs enregistrés.");
      await queryClient.invalidateQueries({ queryKey: ["nutrition-targets"] });
      await queryClient.invalidateQueries({ queryKey: ["journal"] });
    },
    onError: () => setError("Enregistrement impossible. Réessaie."),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    const k = int(kcal);
    const p = int(protein);
    if (!validFrom) return setError("Choisis une date d'effet.");
    if (k === null || k < 500 || k > 10000)
      return setError("Les calories vont de 500 à 10 000 kcal.");
    if (p === null || p > 500) return setError("Les protéines vont de 0 à 500 g.");
    setError(null);
    save.mutate({ validFrom, kcal: k, proteinG: p });
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-3"
    >
      <h2 id={`${id}-title`} className="text-[20px] leading-7 font-bold">
        Mes objectifs par jour
      </h2>
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-from`} className={labelClass}>
            À partir du
          </Label>
          <Input
            id={`${id}-from`}
            type="date"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            className={`${fieldClass} w-44`}
          />
        </div>
        <Field id={`${id}-kcal`} label="Calories (kcal)" value={kcal} onChange={setKcal} numeric />
        <Field
          id={`${id}-prot`}
          label="Protéines (g)"
          value={protein}
          onChange={setProtein}
          numeric
        />
      </div>
      <FormError>{error}</FormError>
      <p role="status" className="text-[15px] text-corridor-ink empty:hidden">
        {status}
      </p>
      <Button
        type="submit"
        disabled={save.isPending}
        className={`${primaryButtonClass} self-start`}
      >
        Enregistrer
      </Button>
    </form>
  );
}
