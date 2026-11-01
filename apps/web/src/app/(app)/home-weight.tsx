"use client";

import { formatWeight, weightChange, weightChangeText } from "@maroutine/core";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { LoadError, Loading } from "@/components/query-state";
import { averageOn, bodyWeightsQuery } from "@/lib/body-weights-query";
import { formatDayMonthLong } from "@/lib/format";
import { WeightForm } from "./poids/weight-form";

// Bloc Poids de l'accueil (D23) : la dernière pesée, la moyenne sur 7 jours, et la pesée du jour.
export function HomeWeight({ today }: { today: string }) {
  const weighIns = useQuery(bodyWeightsQuery);
  const last = weighIns.data?.at(-1);
  const average = weighIns.data ? averageOn(weighIns.data, today) : null;
  // Tendance (F-TDB-1) : moyenne du jour contre celle d'il y a 7 jours, si les deux existent.
  const change = weighIns.data ? weightChange(weighIns.data, today) : null;

  return (
    <section aria-labelledby="weight-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="weight-title" className="text-[20px] leading-7 font-bold">
          Poids
        </h2>
        <Link
          href="/poids"
          className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-[15px] text-action hover:bg-muted"
        >
          Voir la courbe
          <ChevronRight aria-hidden className="size-4" strokeWidth={2} />
        </Link>
      </div>
      {weighIns.isPending ? (
        <Loading />
      ) : weighIns.isError ? (
        <LoadError message="Impossible de charger les pesées." onRetry={() => weighIns.refetch()} />
      ) : (
        <>
          {last ? (
            <p className="text-[17px] tabular-nums">
              {formatWeight(last.weightKg)} kg, le {formatDayMonthLong(last.date)}
              {average === null ? null : (
                <span className="text-muted-foreground">
                  {" "}
                  · moyenne sur 7 jours {formatWeight(average)} kg
                </span>
              )}
            </p>
          ) : null}
          {change === null ? null : (
            <p className="text-[15px] text-muted-foreground tabular-nums">
              Tendance : {weightChangeText(change)}
            </p>
          )}
          <WeightForm today={today} weighIns={weighIns.data} label="Pesée du jour (kg)" />
        </>
      )}
    </section>
  );
}
