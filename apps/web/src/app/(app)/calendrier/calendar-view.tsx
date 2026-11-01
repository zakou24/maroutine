"use client";

import { addMonths, monthGrid, type WorkoutSummary } from "@maroutine/core";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LoadError } from "@/components/query-state";
import { countLabel, formatDayMonthLong, formatLongDate, formatMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import { workoutsQuery } from "@/lib/workouts-query";

const WEEKDAYS = [
  ["L", "lundi"],
  ["M", "mardi"],
  ["M", "mercredi"],
  ["J", "jeudi"],
  ["V", "vendredi"],
  ["S", "samedi"],
  ["D", "dimanche"],
] as const;

function groupByDay(workouts: WorkoutSummary[]) {
  const byDay = new Map<string, WorkoutSummary[]>();
  for (const w of workouts) byDay.set(w.performedOn, [...(byDay.get(w.performedOn) ?? []), w]);
  return byDay;
}

export function CalendarView({
  initialMonth,
  today,
  onMonthChange,
}: {
  initialMonth: string;
  today: string;
  onMonthChange?: (month: string) => void;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [selected, setSelected] = useState<string | null>(null);
  const grid = monthGrid(month);
  const from = grid[0]![0]!;
  const to = grid.at(-1)!.at(-1)!;
  const workouts = useQuery(workoutsQuery(from, to));
  const byDay = groupByDay(workouts.data ?? []);
  const inMonth = (workouts.data ?? []).filter((w) => w.performedOn.startsWith(month));

  function go(delta: number) {
    const next = addMonths(month, delta);
    setMonth(next);
    setSelected(null);
    onMonthChange?.(next);
  }

  const selectedWorkouts = selected ? (byDay.get(selected) ?? []) : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Mois précédent"
          onClick={() => go(-1)}
          className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft aria-hidden className="size-6" strokeWidth={2} />
        </button>
        <h2 className="text-[20px] leading-7 font-bold first-letter:uppercase" aria-live="polite">
          {formatMonth(month)}
        </h2>
        <button
          type="button"
          aria-label="Mois suivant"
          onClick={() => go(1)}
          className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronRight aria-hidden className="size-6" strokeWidth={2} />
        </button>
      </div>

      <div className="rounded-xl border border-rule bg-surface p-2 sm:p-3">
        <table className="w-full table-fixed border-collapse text-center">
          <thead>
            <tr>
              {WEEKDAYS.map(([short, long]) => (
                <th
                  key={long}
                  scope="col"
                  className="pb-1 text-[13px] font-normal text-muted-foreground"
                >
                  <abbr title={long} className="no-underline">
                    {short}
                  </abbr>
                </th>
              ))}
              <th scope="col" className="w-10 pb-1 text-[13px] font-normal text-muted-foreground">
                <abbr title="séances de la semaine" className="no-underline">
                  Total
                </abbr>
              </th>
            </tr>
          </thead>
          <tbody>
            {grid.map((week) => {
              const count = week.reduce((n, day) => n + (byDay.get(day)?.length ?? 0), 0);
              const weekLabel =
                count === 0
                  ? `Aucune séance la semaine du ${formatDayMonthLong(week[0]!)}`
                  : `${countLabel(count, "séance", "séances")} la semaine du ${formatDayMonthLong(week[0]!)}`;
              return (
                <tr key={week[0]}>
                  {week.map((day) => (
                    <td key={day} className="p-0.5">
                      <DayCell
                        day={day}
                        count={byDay.get(day)?.length ?? 0}
                        outside={!day.startsWith(month)}
                        isToday={day === today}
                        selected={day === selected}
                        onSelect={() => setSelected(day === selected ? null : day)}
                      />
                    </td>
                  ))}
                  <td
                    aria-label={weekLabel}
                    className="text-[15px] font-bold text-corridor-ink tabular-nums"
                  >
                    {count > 0 ? count : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {workouts.isError ? (
        <LoadError
          message="Impossible de charger les séances."
          onRetry={() => workouts.refetch()}
        />
      ) : workouts.isSuccess && inMonth.length === 0 ? (
        <p className="text-[17px] text-muted-foreground">Aucune séance ce mois-ci.</p>
      ) : null}

      {selected && selectedWorkouts.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-[17px] font-bold first-letter:uppercase">
            {formatLongDate(selected)}
          </h3>
          <ul
            aria-label={`Séances du ${formatLongDate(selected)}`}
            className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-surface"
          >
            {selectedWorkouts.map((w, i) => (
              <li key={w.id}>
                <WorkoutLink
                  workout={w}
                  title={selectedWorkouts.length > 1 ? `Séance ${i + 1}` : "Séance"}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function DayCell({
  day,
  count,
  outside,
  isToday,
  selected,
  onSelect,
}: {
  day: string;
  count: number;
  outside: boolean;
  isToday: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const number = Number(day.slice(8));
  const base = cn(
    "mx-auto flex h-11 w-full max-w-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[15px] tabular-nums",
    outside ? "text-muted-foreground" : "text-foreground",
    isToday && "font-bold",
  );
  // Même hauteur avec ou sans pastille, pour que les chiffres restent alignés.
  if (count === 0) {
    return (
      <span className={base} aria-current={isToday ? "date" : undefined}>
        {number}
        <span aria-hidden className="size-1.5" />
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-current={isToday ? "date" : undefined}
      onClick={onSelect}
      className={cn(base, "hover:bg-muted", selected && "bg-corridor text-corridor-ink")}
    >
      {/* Nom porté par le texte et non par aria-label : « 1er novembre » ne contient pas le « 1 »
          affiché, ce qu'axe signale (label-content-name-mismatch) le 1er de chaque mois. */}
      <span aria-hidden>{number}</span>
      <span className="sr-only">{`${formatDayMonthLong(day)}, ${countLabel(count, "séance", "séances")}`}</span>
      <span aria-hidden className="size-1.5 rounded-full bg-action" />
    </button>
  );
}

// Ligne d'une séance : par défaut sa date, ou un titre fourni quand la date est déjà affichée.
// `showSets` : l'accueil n'affiche pas le nombre de séries (retour du propriétaire, Lot 4.1).
export function WorkoutLink({
  workout,
  title,
  showSets = true,
}: {
  workout: WorkoutSummary;
  title?: string;
  showSets?: boolean;
}) {
  return (
    <Link
      href={`/seances/${workout.id}`}
      className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-muted"
    >
      <span className="flex flex-1 flex-col">
        <span className="text-[17px] first-letter:uppercase">
          {title ?? formatLongDate(workout.performedOn)}
        </span>
        <span className="text-[15px] text-muted-foreground">
          {[
            countLabel(workout.exerciseCount, "exercice", "exercices"),
            showSets
              ? countLabel(workout.workingSetCount, "série de travail", "séries de travail")
              : null,
            workout.cardioMinutes ? `cardio ${workout.cardioMinutes} min` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <ChevronRight aria-hidden className="size-5 text-muted-foreground" strokeWidth={2} />
    </Link>
  );
}
