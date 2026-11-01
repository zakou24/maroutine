"use client";

import {
  addDays,
  averageIntake,
  daysBetween,
  loadLabel,
  periodStart,
  targetLabel,
  trendLabel,
  type Equipment,
  type Exercise,
  type Period,
  type SessionStats,
  type SuggestionResponse,
  type Trend,
} from "@maroutine/core";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { LoadError, Loading } from "@/components/query-state";
import {
  countLabel,
  formatGrams,
  formatKcal,
  formatLongDate,
  formatMax,
  formatVolume,
} from "@/lib/format";
import { nutritionDaysQuery, statsQuery, suggestionQuery } from "@/lib/stats-queries";
import { useToday } from "@/lib/use-today";
import { cn } from "@/lib/utils";
import { ProgressChart } from "./progress-chart";
import { RegressionContext } from "./regression-context";

const PERIOD_LABELS: Record<Period, string> = {
  "1m": "1 mois",
  "3m": "3 mois",
  "1y": "1 an",
  all: "Tout",
};

export function TrendBadge({ trend }: { trend: Trend }) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-[15px] font-bold",
        // L'orange est réservé aux régressions (D13).
        trend === "regressing"
          ? "bg-regression-wash text-regression-ink"
          : "bg-muted text-foreground",
      )}
    >
      {trendLabel(trend)}
    </span>
  );
}

function bestSetLabel(equipment: Equipment, set: { weightKg: number; reps: number }) {
  return `${loadLabel(equipment, set.weightKg)} × ${set.reps}`;
}

function chartSummary(sessions: SessionStats[], period: Period): string {
  const span = period === "all" ? "toute la période" : PERIOD_LABELS[period];
  const maxima = sessions.flatMap((s) => (s.estimatedMax === null ? [] : [s.estimatedMax]));
  const count = countLabel(maxima.length, "séance", "séances");
  if (maxima.length === 1) return `${count} sur ${span}, à ${formatMax(maxima[0]!)} kg.`;
  return `${count} sur ${span}, de ${formatMax(Math.min(...maxima))} à ${formatMax(Math.max(...maxima))} kg.`;
}

type Overlay = "none" | "kcal" | "protein";

const OVERLAY_LABELS: Record<Overlay, string> = {
  none: "Rien",
  kcal: "Calories",
  protein: "Protéines",
};

// La route des jours alimentaires couvre 400 jours au plus.
const MAX_OVERLAY_DAYS = 400;

// Jours alimentaires superposés à la courbe (F-TDB-2) : la période affichée jusqu'à aujourd'hui.
function overlayRange(period: Period, today: string, firstSession: string | undefined) {
  const start = periodStart(today, period) ?? firstSession ?? today;
  const floor = addDays(today, -MAX_OVERLAY_DAYS);
  return { from: daysBetween(floor, start) < 0 ? floor : start, to: today };
}

export function ExerciseStats({ exercise }: { exercise: Exercise }) {
  const [period, setPeriod] = useState<Period>("3m");
  const [overlay, setOverlay] = useState<Overlay>("none");
  const stats = useQuery({ ...statsQuery(exercise.id, period), placeholderData: (prev) => prev });
  const suggestion = useQuery(suggestionQuery(exercise.id));
  const today = useToday();
  const range = today ? overlayRange(period, today, stats.data?.sessions[0]?.performedOn) : null;
  const food = useQuery({
    ...nutritionDaysQuery(range?.from ?? "", range?.to ?? ""),
    enabled: overlay !== "none" && range !== null,
  });
  const id = useId();

  if (stats.isPending) return <Loading />;
  if (stats.isError) {
    return <LoadError message="Impossible de charger les stats." onRetry={() => stats.refetch()} />;
  }

  const { trend, latest, sessions } = stats.data;
  const withMax = sessions.some((s) => s.estimatedMax !== null);
  const history = [...sessions].reverse();
  // Signal de régression (F-TDB-5) : tendance en baisse, ou règle 2 de la suggestion (D20).
  const declining = suggestion.data?.suggestion.rule === "declining";
  // Sur tout l'historique : la période affichée ne doit pas faire disparaître l'encart.
  const lastMaxOn = stats.data.lastMaxOn;
  const contextDate = (trend === "regressing" || declining) && lastMaxOn ? lastMaxOn : null;
  const intake = overlay !== "none" && food.data ? averageIntake(food.data) : null;
  const foodPoints =
    overlay !== "none" && food.data
      ? food.data
          .filter((d) => d.entryCount > 0)
          .map((d) => ({ date: d.date, value: overlay === "kcal" ? d.kcal : d.proteinG }))
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <TrendBadge trend={trend} />
        {latest?.estimatedMax != null ? (
          <span className="text-[17px] tabular-nums">
            Dernier max estimé : {formatMax(latest.estimatedMax)} kg
            {latest.approximate ? " approx." : ""}
          </span>
        ) : latest?.bestSet ? (
          <span className="text-[17px] tabular-nums">
            Meilleure série : {bestSetLabel(exercise.equipment, latest.bestSet)}
          </span>
        ) : null}
      </div>

      {suggestion.data ? (
        <NextSession
          exercise={exercise}
          data={suggestion.data}
          targetId={contextDate ? `${id}-context` : `${id}-history`}
          targetLabel={contextDate ? "Voir le poids et l'alimentation" : "Voir l'historique"}
        />
      ) : null}

      {contextDate ? (
        <RegressionContext sessionDate={contextDate} headingId={`${id}-context`} />
      ) : null}

      {latest === null ? (
        <p className="text-[17px] text-muted-foreground">Pas encore de séance avec cet exercice.</p>
      ) : (
        <>
          <section aria-labelledby={`${id}-chart`} className="flex flex-col gap-3">
            <h2 id={`${id}-chart`} className="text-[20px] leading-7 font-bold">
              Max estimé
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
            {exercise.equipment === "bodyweight" && !withMax ? (
              <p className="text-[15px] text-muted-foreground">
                Le max estimé des exercices au poids du corps utilise ta pesée : il arrivera avec le
                suivi du poids.
              </p>
            ) : withMax ? (
              <>
                <div
                  className="flex flex-wrap items-center gap-2"
                  role="group"
                  aria-label="Superposer"
                >
                  <span className="text-[15px] text-muted-foreground">Superposer</span>
                  {(Object.keys(OVERLAY_LABELS) as Overlay[]).map((o) => (
                    <button
                      key={o}
                      type="button"
                      aria-pressed={o === overlay}
                      onClick={() => setOverlay(o)}
                      className={cn(
                        "min-h-11 rounded-lg border border-rule px-3 text-[15px]",
                        o === overlay
                          ? "border-action bg-corridor font-bold text-corridor-ink"
                          : "bg-surface hover:bg-muted",
                      )}
                    >
                      {OVERLAY_LABELS[o]}
                    </button>
                  ))}
                </div>
                <ProgressChart points={stats.data.corridor} food={foodPoints} />
                <p className="text-[15px] text-muted-foreground">
                  {chartSummary(sessions, period)}
                </p>
                {intake === null ? null : (
                  <p className="text-[15px] text-muted-foreground tabular-nums">
                    {overlay === "kcal"
                      ? formatKcal(intake.kcal)
                      : `${formatGrams(intake.proteinG)} de protéines`}{" "}
                    par jour en moyenne sur{" "}
                    {countLabel(intake.days, "jour renseigné", "jours renseignés")}.
                  </p>
                )}
              </>
            ) : (
              <p className="text-[15px] text-muted-foreground">
                Aucune séance sur {period === "all" ? "toute la période" : PERIOD_LABELS[period]}.
              </p>
            )}
          </section>

          <section aria-labelledby={`${id}-history`} className="flex flex-col gap-3">
            <h2 id={`${id}-history`} className="scroll-mt-6 text-[20px] leading-7 font-bold">
              Historique
            </h2>
            {history.length > 0 ? (
              <ul
                aria-label="Historique"
                className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-surface"
              >
                {history.map((s) => (
                  <li key={s.workoutId}>
                    <Link
                      href={`/seances/${s.workoutId}`}
                      className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-muted"
                    >
                      <span className="flex flex-1 flex-col">
                        <span className="text-[17px] first-letter:uppercase">
                          {formatLongDate(s.performedOn)}
                        </span>
                        <span className="text-[15px] text-muted-foreground tabular-nums">
                          {[
                            s.bestSet ? bestSetLabel(exercise.equipment, s.bestSet) : null,
                            s.estimatedMax === null
                              ? null
                              : `max ${formatMax(s.estimatedMax)} kg${s.approximate ? " approx." : ""}`,
                            s.volumeKg === null ? null : `volume ${formatVolume(s.volumeKg)}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
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
            ) : (
              <p className="text-[15px] text-muted-foreground">Aucune séance sur cette période.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

// Encart « Prochaine séance » : cible et justification (F-STA-4).
// `historyId` vient de useId : Next.js garde les fiches déjà vues montées et cachées, un id fixe
// pourrait viser la fiche d'un autre exercice.
function NextSession({
  exercise,
  data,
  targetId,
  targetLabel: linkLabel,
}: {
  exercise: Exercise;
  data: SuggestionResponse;
  targetId: string;
  targetLabel: string;
}) {
  const id = useId();
  const declining = data.suggestion.rule === "declining";
  const target = targetLabel(data.suggestion, exercise.equipment);
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "flex flex-col gap-1 rounded-xl px-4 py-3",
        declining ? "bg-regression-wash text-regression-ink" : "bg-corridor text-corridor-ink",
      )}
    >
      <h2 id={id} className="text-[15px]">
        Prochaine séance
      </h2>
      {target ? <p className="text-[20px] leading-7 font-bold tabular-nums">{target}</p> : null}
      <p className="text-[15px]">{data.text}</p>
      {declining ? (
        <a href={`#${targetId}`} className="text-[15px] font-bold underline underline-offset-4">
          {linkLabel}
        </a>
      ) : null}
    </section>
  );
}
