"use client";

import {
  dayStatusLabel,
  formatWeight,
  weightChange,
  weightChangeText,
  windowDays,
} from "@maroutine/core";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { LoadError } from "@/components/query-state";
import { averageOn, bodyWeightsQuery } from "@/lib/body-weights-query";
import { formatDayMonthLong, formatGrams, formatKcal, formatLongDate } from "@/lib/format";
import { nutritionDaysQuery } from "@/lib/stats-queries";

// Autour de la baisse (F-TDB-5) : les 3 jours qui précèdent la dernière séance (sa fenêtre
// alimentaire) et le poids ce jour-là, avec des liens vers le journal et l'écran Poids.
// Descriptif : rien n'y dit que l'alimentation explique la baisse (§6.8).
export function RegressionContext({
  sessionDate,
  headingId,
}: {
  sessionDate: string;
  headingId: string;
}) {
  const window = windowDays(sessionDate);
  const days = useQuery(nutritionDaysQuery(window[0]!, window.at(-1)!));
  const weighIns = useQuery(bodyWeightsQuery);
  const average = weighIns.data ? averageOn(weighIns.data, sessionDate) : null;
  const change = weighIns.data ? weightChange(weighIns.data, sessionDate) : null;

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-xl bg-regression-wash px-4 py-3 text-regression-ink"
    >
      <div className="flex flex-col gap-0.5">
        <h2 id={headingId} className="scroll-mt-6 text-[17px] font-bold">
          Autour de la baisse
        </h2>
        <p className="text-[15px]">
          Les 3 jours avant ta séance du {formatDayMonthLong(sessionDate)}.
        </p>
      </div>
      {days.isError ? (
        <LoadError message="Impossible de charger ces jours." onRetry={() => days.refetch()} />
      ) : days.data ? (
        <ul className="flex flex-col divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-surface text-foreground">
          {days.data.map((day) => (
            <li key={day.date}>
              <Link
                href={`/alimentation?date=${day.date}`}
                className="flex min-h-14 items-center gap-3 px-3 py-2 hover:bg-muted"
              >
                <span className="flex flex-1 flex-col">
                  <span className="text-[15px] first-letter:uppercase">
                    {formatLongDate(day.date)}
                  </span>
                  <span className="text-[13px] text-muted-foreground tabular-nums">
                    {day.entryCount === 0
                      ? "Aucun repas noté"
                      : day.target
                        ? `${formatKcal(day.kcal)} sur ${formatKcal(day.target.kcal)} · ${formatGrams(day.proteinG)} sur ${formatGrams(day.target.proteinG)} de protéines`
                        : `${formatKcal(day.kcal)} · ${formatGrams(day.proteinG)} de protéines`}
                  </span>
                </span>
                <span className="text-[13px] font-bold">{dayStatusLabel(day.status)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <Link
        href="/poids"
        className="flex min-h-11 items-center gap-1 self-start text-[15px] font-bold underline underline-offset-4"
      >
        Poids
        {average === null
          ? " : pas de moyenne ce jour-là"
          : ` : ${formatWeight(average)} kg en moyenne${change === null ? "" : `, ${weightChangeText(change)}`}`}
        <ChevronRight aria-hidden className="size-4" strokeWidth={2} />
      </Link>
    </section>
  );
}
