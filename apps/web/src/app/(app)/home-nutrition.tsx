"use client";

import { addDays, dayStatusLabel, type NutritionDay } from "@maroutine/core";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { LoadError } from "@/components/query-state";
import { countLabel, formatLongDate } from "@/lib/format";
import { nutritionDaysQuery } from "@/lib/stats-queries";
import { cn } from "@/lib/utils";

const INITIALS = ["L", "M", "M", "J", "V", "S", "D"];

// Pastille d'un jour : pleine si engagé, au trait si non engagé, vide sinon. Sans couleur de
// jugement : l'orange reste aux régressions (D13).
const DOT: Record<NutritionDay["status"], string> = {
  engaged: "bg-action",
  notEngaged: "border-2 border-muted-foreground",
  unrated: "border border-dashed border-rule",
  unrecorded: "border border-rule",
};

// Jours engagés de la semaine en cours (F-TDB-1), du lundi à aujourd'hui.
export function HomeNutrition({ start, today }: { start: string; today: string }) {
  const end = addDays(start, 6);
  const days = useQuery(nutritionDaysQuery(start, end));

  if (days.isPending) return null;
  if (days.isError) {
    return (
      <LoadError message="Impossible de charger l'alimentation." onRetry={() => days.refetch()} />
    );
  }

  const past = days.data.filter((d) => d.date <= today);
  const engaged = past.filter((d) => d.status === "engaged").length;
  const recorded = past.filter((d) => d.status !== "unrecorded").length;
  const rated = past.some((d) => d.target !== null);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-rule bg-surface px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[17px] font-bold">Alimentation</h3>
        <Link
          href="/alimentation"
          className="flex min-h-11 items-center rounded-lg px-2 text-[15px] text-action hover:bg-muted"
        >
          Repas
        </Link>
      </div>
      <p className="text-[15px]">
        {recorded === 0
          ? "Aucun repas noté cette semaine."
          : !rated
            ? "Fixe tes objectifs pour voir tes jours engagés."
            : `${countLabel(engaged, "jour engagé", "jours engagés")} sur ${countLabel(recorded, "renseigné", "renseignés")}`}
      </p>
      {!rated && recorded > 0 ? (
        <Link
          href="/objectifs"
          className="self-start text-[15px] text-action underline underline-offset-4"
        >
          Objectifs
        </Link>
      ) : null}
      <ol aria-label="Jours de la semaine" className="grid grid-cols-7 gap-1">
        {days.data.map((day, i) => {
          const future = day.date > today;
          return (
            <li key={day.date}>
              <Link
                href={`/alimentation?date=${day.date}`}
                aria-disabled={future || undefined}
                tabIndex={future ? -1 : undefined}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg text-[12px] text-muted-foreground",
                  future ? "pointer-events-none opacity-50" : "hover:bg-muted",
                )}
              >
                <span aria-hidden>{INITIALS[i]}</span>
                <span
                  aria-hidden
                  className={cn("size-3 rounded-full", !future && DOT[day.status])}
                />
                <span className="sr-only">
                  {`${formatLongDate(day.date)} : ${future ? "à venir" : dayStatusLabel(day.status).toLowerCase()}`}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
