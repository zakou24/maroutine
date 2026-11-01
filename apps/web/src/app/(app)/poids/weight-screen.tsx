"use client";

import {
  formatWeight,
  periodStart,
  weightSeries,
  type BodyWeight,
  type Period,
} from "@maroutine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { FormError } from "@/components/form-error";
import { LoadError, Loading } from "@/components/query-state";
import { apiFetch } from "@/lib/api";
import { bodyWeightsQuery } from "@/lib/body-weights-query";
import { countLabel, formatDayMonthLong, formatLongDate } from "@/lib/format";
import { invalidateStats } from "@/lib/stats-queries";
import { useToday } from "@/lib/use-today";
import { cn } from "@/lib/utils";
import { WeightChart } from "./weight-chart";
import { WeightForm } from "./weight-form";

const PERIOD_LABELS: Record<Period, string> = {
  "1m": "1 mois",
  "3m": "3 mois",
  "1y": "1 an",
  all: "Tout",
};

export function WeightScreen() {
  const today = useToday();
  if (today === null) return <Loading />;
  return <WeightView today={today} />;
}

// Moyenne glissante du jour (J-6 à J), pour l'accueil ; null sous 3 pesées en 7 jours.
export function averageOn(weighIns: BodyWeight[], day: string): number | null {
  return weightSeries(weighIns, day, day)[0]?.average ?? null;
}

export function WeightView({ today }: { today: string }) {
  const id = useId();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<Period>("3m");
  const [error, setError] = useState<string | null>(null);
  const weighIns = useQuery(bodyWeightsQuery);
  const remove = useMutation({
    mutationFn: (date: string) =>
      apiFetch<void>(`/api/v1/body-weights/${date}`, { method: "DELETE" }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["body-weights"] });
      await invalidateStats(queryClient);
    },
    onError: () => setError("Suppression impossible. Réessaie."),
  });

  if (weighIns.isPending) return <Loading />;
  if (weighIns.isError) {
    return (
      <LoadError message="Impossible de charger les pesées." onRetry={() => weighIns.refetch()} />
    );
  }

  const all = weighIns.data;
  const from = periodStart(today, period) ?? all[0]?.date ?? today;
  const inPeriod = all.filter((w) => w.date >= from && w.date <= today);
  const series = weightSeries(all, from, today);
  const average = series.filter((p) => p.average !== null).at(-1)?.average ?? null;
  const span = period === "all" ? "toute la période" : PERIOD_LABELS[period];
  const summary = `${countLabel(inPeriod.length, "pesée", "pesées")} sur ${span}. ${
    average === null
      ? "Pas encore de moyenne sur 7 jours (3 pesées en 7 jours)."
      : `Moyenne sur 7 jours : ${formatWeight(average)} kg.`
  }`;

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby={`${id}-form`} className="flex flex-col gap-3">
        <h2 id={`${id}-form`} className="text-[20px] leading-7 font-bold">
          Noter une pesée
        </h2>
        <WeightForm today={today} weighIns={all} withDate />
      </section>

      {all.length === 0 ? (
        <p className="text-[17px] text-muted-foreground">Aucune pesée pour l&apos;instant.</p>
      ) : (
        <>
          <section aria-labelledby={`${id}-chart`} className="flex flex-col gap-3">
            <h2 id={`${id}-chart`} className="text-[20px] leading-7 font-bold">
              Courbe
            </h2>
            <div className="flex gap-2" role="group" aria-label="Période">
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={p === period}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "min-h-11 flex-1 rounded-lg border border-rule px-2 text-[15px]",
                    p === period
                      ? "border-action bg-corridor font-bold text-corridor-ink"
                      : "bg-surface hover:bg-muted",
                  )}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
            <WeightChart points={series} />
            <p className="text-[15px] text-muted-foreground">{summary}</p>
          </section>

          <section aria-labelledby={`${id}-list`} className="flex flex-col gap-3">
            <h2 id={`${id}-list`} className="text-[20px] leading-7 font-bold">
              Pesées
            </h2>
            <FormError>{error}</FormError>
            {inPeriod.length > 0 ? (
              <ul
                aria-labelledby={`${id}-list`}
                className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-surface"
              >
                {[...inPeriod].reverse().map((w) => (
                  <li key={w.date} className="flex min-h-14 items-center gap-3 pr-1 pl-4">
                    <span className="flex-1 text-[17px] first-letter:uppercase">
                      {formatLongDate(w.date)}
                    </span>
                    <span className="text-[17px] font-bold tabular-nums">
                      {formatWeight(w.weightKg)} kg
                    </span>
                    <button
                      type="button"
                      aria-label={`Supprimer la pesée du ${formatDayMonthLong(w.date)}`}
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(w.date)}
                      className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Trash2 aria-hidden className="size-5" strokeWidth={2} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[15px] text-muted-foreground">Aucune pesée sur cette période.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
