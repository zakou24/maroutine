"use client";

import { activityWeeks, type WorkoutSummary } from "@maroutine/core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LoadError } from "@/components/query-state";
import { countLabel, formatDayMonthLong, formatLongDate, formatMonthShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { workoutsQuery } from "@/lib/workouts-query";
import { WorkoutLink } from "./calendrier/calendar-view";

const WEEKS = 13;
// Initiales des jours affichées à gauche, une ligne sur deux (comme le graphe d'activité de GitHub).
const DAY_LABELS = ["L", "", "M", "", "V", "", ""];

const LEVEL_CLASS = {
  0: "bg-rule-soft",
  1: "bg-action",
  2: "bg-action-strong",
} as const;

function levelOf(count: number): 0 | 1 | 2 {
  return count === 0 ? 0 : count === 1 ? 1 : 2;
}

// Calendrier d'activité des 3 derniers mois (D17) : une colonne par semaine, une case par jour.
export function ActivityCalendar({ today }: { today: string }) {
  const weeks = activityWeeks(today, WEEKS);
  const from = weeks[0]![0]!;
  const workouts = useQuery(workoutsQuery(from, today));
  const [selected, setSelected] = useState<string | null>(null);

  const byDay = new Map<string, WorkoutSummary[]>();
  for (const w of workouts.data ?? []) {
    byDay.set(w.performedOn, [...(byDay.get(w.performedOn) ?? []), w]);
  }
  const total = workouts.data?.length ?? 0;
  const selectedWorkouts = selected ? (byDay.get(selected) ?? []) : [];

  // Nom du mois au-dessus de la première colonne et de celle qui contient le 1er du mois.
  const monthLabels = weeks.map((week, w) => {
    const first = week.find((day) => day.endsWith("-01"));
    if (first) return formatMonthShort(first);
    return w === 0 ? formatMonthShort(week[0]!) : "";
  });

  return (
    <section aria-labelledby="activity-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="activity-title" className="text-[20px] leading-7 font-bold">
          3 derniers mois
        </h2>
        {workouts.isSuccess ? (
          <p className="text-[15px] text-muted-foreground">
            {countLabel(total, "séance", "séances")}
          </p>
        ) : null}
      </div>

      {workouts.isError ? (
        <LoadError message="Impossible de charger l'activité." onRetry={() => workouts.refetch()} />
      ) : (
        <div className="rounded-xl border border-rule bg-surface p-3 sm:w-fit sm:p-4">
          <div
            className="grid gap-1 sm:w-[400px]"
            style={{ gridTemplateColumns: `1.25rem repeat(${WEEKS}, minmax(0, 1fr))` }}
          >
            <span aria-hidden />
            {monthLabels.map((label, w) => (
              <span
                key={weeks[w]![0]}
                aria-hidden
                className="overflow-visible text-[12px] leading-4 whitespace-nowrap text-muted-foreground"
              >
                {label}
              </span>
            ))}
            {DAY_LABELS.map((dayLabel, d) => (
              <Row
                key={d}
                label={dayLabel}
                days={weeks.map((week) => week[d]!)}
                today={today}
                byDay={byDay}
                selected={selected}
                onSelect={(day) => setSelected(day === selected ? null : day)}
              />
            ))}
          </div>
          <p aria-hidden className="mt-3 flex items-center gap-2 text-[12px] text-muted-foreground">
            Aucune <span className={cn("size-3 rounded-[3px]", LEVEL_CLASS[0])} />1 séance
            <span className={cn("size-3 rounded-[3px]", LEVEL_CLASS[1])} />2 et plus
            <span className={cn("size-3 rounded-[3px]", LEVEL_CLASS[2])} />
          </p>
        </div>
      )}

      {selected && selectedWorkouts.length > 0 ? (
        <ul
          aria-label={`Séances du ${formatLongDate(selected)}`}
          className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-surface"
        >
          {selectedWorkouts.map((w) => (
            <li key={w.id}>
              <WorkoutLink workout={w} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function Row({
  label,
  days,
  today,
  byDay,
  selected,
  onSelect,
}: {
  label: string;
  days: string[];
  today: string;
  byDay: Map<string, WorkoutSummary[]>;
  selected: string | null;
  onSelect: (day: string) => void;
}) {
  return (
    <>
      <span aria-hidden className="text-[12px] leading-none text-muted-foreground">
        {label}
      </span>
      {days.map((day) => {
        const cell = "aspect-square w-full rounded-[3px]";
        if (day > today) return <span key={day} aria-hidden className={cell} />;
        const count = byDay.get(day)?.length ?? 0;
        if (count === 0) return <span key={day} aria-hidden className={cn(cell, LEVEL_CLASS[0])} />;
        const level = levelOf(count);
        return (
          <button
            key={day}
            type="button"
            data-level={level}
            aria-label={`${formatDayMonthLong(day)}, ${countLabel(count, "séance", "séances")}`}
            aria-pressed={selected === day}
            onClick={() => onSelect(day)}
            className={cn(
              cell,
              LEVEL_CLASS[level],
              selected === day && "ring-2 ring-ink ring-offset-1 ring-offset-surface",
            )}
          />
        );
      })}
    </>
  );
}
