"use client";

import { addDays, startOfWeek } from "@maroutine/core";
import { useQuery } from "@tanstack/react-query";
import { PencilLine } from "lucide-react";
import Link from "next/link";
import { LoadError, Loading } from "@/components/query-state";
import { countLabel, formatDayMonthLong } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { workoutsQuery } from "@/lib/workouts-query";
import { WorkoutLink } from "./calendrier/calendar-view";

export function WeekSummary() {
  const today = useToday();
  if (today === null) return <Loading />;
  return <Week today={today} />;
}

function Week({ today }: { today: string }) {
  const start = startOfWeek(today);
  const end = addDays(start, 6);
  const workouts = useQuery(workoutsQuery(start, end));

  const entryLink = (
    <Link
      href="/saisie"
      className="inline-flex h-[52px] items-center justify-center gap-2 rounded-xl bg-action px-5 text-[17px] font-bold text-white hover:bg-[#174a84]"
    >
      <PencilLine aria-hidden className="size-5" strokeWidth={2} />
      Saisie du soir
    </Link>
  );

  if (workouts.isPending) return <Loading />;
  if (workouts.isError) {
    return (
      <LoadError message="Impossible de charger la semaine." onRetry={() => workouts.refetch()} />
    );
  }

  const list = workouts.data;
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[17px] text-muted-foreground">
        Semaine du {formatDayMonthLong(start)} au {formatDayMonthLong(end)}
      </p>
      {list.length === 0 ? (
        <p className="text-[17px]">Pas encore de séance cette semaine.</p>
      ) : (
        <>
          <p className="text-[17px] font-bold">{countLabel(list.length, "séance", "séances")}</p>
          <ul
            aria-label="Séances de la semaine"
            className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-surface"
          >
            {list.map((w) => (
              <li key={w.id}>
                <WorkoutLink workout={w} />
              </li>
            ))}
          </ul>
        </>
      )}
      <div>{entryLink}</div>
    </div>
  );
}
