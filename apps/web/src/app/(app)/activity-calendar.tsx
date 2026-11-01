"use client";

import {
  activityWeeks,
  muscleGroupLabel,
  sortMuscleGroups,
  type MuscleGroup,
  type WorkoutSummary,
} from "@maroutine/core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LoadError } from "@/components/query-state";
import { countLabel, formatDayMonthLong, formatLongDate, formatMonthShort } from "@/lib/format";
import { MUSCLE_COLOR, squareBackground } from "@/lib/muscle-colors";
import { cn } from "@/lib/utils";
import { workoutsQuery } from "@/lib/workouts-query";
import { WorkoutLink } from "./calendrier/calendar-view";

const WEEKS = 13;
// Initiales des jours affichées à gauche, une ligne sur deux (comme le graphe d'activité de GitHub).
const DAY_LABELS = ["L", "", "M", "", "V", "", ""];

// Muscles d'un jour : ceux de toutes ses séances réunies, dans l'ordre des groupes (Lot 4.2).
function dayMuscles(workouts: WorkoutSummary[]): MuscleGroup[] {
  return sortMuscleGroups(workouts.flatMap((w) => w.muscleGroups));
}

// Nom du mois au-dessus de la colonne qui contient le 1er du mois, et au-dessus de la première
// colonne sauf si la suivante en porte déjà un (les deux se chevaucheraient sur iPhone).
export function monthLabels(weeks: string[][]): string[] {
  const labels = weeks.map((week) => {
    const first = week.find((day) => day.endsWith("-01"));
    return first ? formatMonthShort(first) : "";
  });
  if (labels[0] === "" && labels[1] === "") labels[0] = formatMonthShort(weeks[0]![0]!);
  return labels;
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

  const labels = monthLabels(weeks);
  // Légende : les muscles présents sur les 3 mois, et « Sans muscle » si une séance n'en a aucun.
  const shown = [...byDay.values()].map(dayMuscles);
  const legend = sortMuscleGroups(shown.flat());
  const unclassified = shown.some((groups) => groups.length === 0);

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
            {labels.map((label, w) => (
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
          {legend.length > 0 || unclassified ? (
            <ul
              aria-label="Couleurs des muscles"
              className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-rule-soft pt-3 text-[13px] sm:w-[400px]"
            >
              {legend.map((group) => (
                <li key={group} className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="size-3 rounded-[3px]"
                    style={{ background: MUSCLE_COLOR[group] }}
                  />
                  {muscleGroupLabel(group)}
                </li>
              ))}
              {unclassified ? (
                <li className="flex items-center gap-1.5">
                  <span aria-hidden className="size-3 rounded-[3px] bg-rule" />
                  Sans muscle
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      )}

      {selected && selectedWorkouts.length > 0 ? (
        <ul
          aria-label={`Séances du ${formatLongDate(selected)}`}
          className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-surface"
        >
          {selectedWorkouts.map((w) => (
            <li key={w.id}>
              <WorkoutLink workout={w} showSets={false} showMuscles />
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
        const cell =
          "flex aspect-square w-full items-center justify-center rounded-[4px] text-[11px] leading-none tabular-nums";
        if (day > today) return <span key={day} aria-hidden className={cell} />;
        const number = Number(day.slice(8));
        const isToday = day === today;
        // Aujourd'hui : un contour en pointillés ; le jour choisi : un contour plein, plus épais.
        const todayMark = isToday && "outline-1 outline-offset-1 outline-ink outline-dashed";
        const sessions = byDay.get(day) ?? [];
        if (sessions.length === 0) {
          return (
            <span
              key={day}
              aria-hidden
              className={cn(cell, "bg-rule-soft text-muted-foreground", todayMark)}
            >
              {number}
            </span>
          );
        }
        const groups = dayMuscles(sessions);
        const name = [
          formatDayMonthLong(day),
          countLabel(sessions.length, "séance", "séances"),
          ...groups.map(muscleGroupLabel),
        ].join(", ");
        return (
          <button
            key={day}
            type="button"
            data-muscles={groups.join(" ")}
            aria-pressed={selected === day}
            onClick={() => onSelect(day)}
            style={groups.length > 0 ? { background: squareBackground(groups) } : undefined}
            className={cn(
              cell,
              "font-bold",
              groups.length > 0 ? "text-white" : "bg-rule text-foreground",
              todayMark,
              selected === day && "outline-2 outline-offset-1 outline-ink outline-solid",
            )}
          >
            {/* Nom porté par le texte et non par aria-label : « 1er novembre » ne contient pas le
                « 1 » affiché (label-content-name-mismatch), comme dans l'écran Calendrier. */}
            <span aria-hidden>{number}</span>
            <span className="sr-only">{name}</span>
          </button>
        );
      })}
    </>
  );
}
