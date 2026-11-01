"use client";

import { trendLabel, type Trend } from "@maroutine/core";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { LoadError } from "@/components/query-state";
import { trendsQuery } from "@/lib/stats-queries";
import { cn } from "@/lib/utils";
import { exercisesQuery } from "./exercices/exercise-list";

const GROUPS: Trend[] = ["progressing", "stalling", "regressing"];

// Exercices regroupés par tendance (F-TDB-1). Inactifs et sans assez de données ne sont pas
// listés : ils n'ont rien à dire cette semaine.
export function HomeTrends() {
  const trends = useQuery(trendsQuery);
  const exercises = useQuery(exercisesQuery("active"));

  if (trends.isPending || exercises.isPending) return null;
  if (trends.isError || exercises.isError) {
    return (
      <LoadError
        message="Impossible de charger les tendances."
        onRetry={() => {
          trends.refetch();
          exercises.refetch();
        }}
      />
    );
  }

  const names = new Map(exercises.data.map((e) => [e.id, e.name]));
  const groups = GROUPS.map((trend) => ({
    trend,
    items: trends.data
      .filter((t) => t.trend === trend && names.has(t.exerciseId))
      .map((t) => ({ id: t.exerciseId, name: names.get(t.exerciseId)! }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr")),
  })).filter((g) => g.items.length > 0);

  return (
    <section aria-labelledby="trends-title" className="flex flex-col gap-3">
      <h2 id="trends-title" className="text-[20px] leading-7 font-bold">
        Exercices
      </h2>
      {groups.length === 0 ? (
        <p className="text-[15px] text-muted-foreground">
          La tendance d&apos;un exercice apparaît après 6 séances avec un max estimé.
        </p>
      ) : (
        groups.map(({ trend, items }) => (
          <div key={trend} className="flex flex-col gap-2">
            <h3
              className={cn(
                "text-[15px] font-bold",
                // L'orange est réservé aux régressions (D13).
                trend === "regressing" ? "text-regression-ink" : "text-muted-foreground",
              )}
            >
              {trendLabel(trend)} ({items.length})
            </h3>
            <ul aria-label={trendLabel(trend)} className="flex flex-wrap gap-2">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/exercices/${item.id}`}
                    className={cn(
                      "flex min-h-11 items-center rounded-lg border px-3 text-[15px]",
                      trend === "regressing"
                        ? "border-regression bg-regression-wash font-bold text-regression-ink"
                        : "border-rule bg-surface hover:bg-muted",
                    )}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
