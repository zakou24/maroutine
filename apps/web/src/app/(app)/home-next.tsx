"use client";

import { targetLabel } from "@maroutine/core";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { LoadError } from "@/components/query-state";
import { formatDayMonthLong } from "@/lib/format";
import { nextQuery } from "@/lib/stats-queries";
import { cn } from "@/lib/utils";

// Prochaine séance (F-TDB-1) : la suggestion de chaque exercice de la dernière séance.
export function HomeNext() {
  const next = useQuery(nextQuery);

  if (next.isPending) return null;
  if (next.isError) {
    return (
      <LoadError message="Impossible de charger les suggestions." onRetry={() => next.refetch()} />
    );
  }
  if (next.data.items.length === 0 || !next.data.performedOn) return null;

  return (
    <section aria-labelledby="next-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="next-title" className="text-[20px] leading-7 font-bold">
          Prochaine séance
        </h2>
        <p className="text-[15px] text-muted-foreground">
          D&apos;après ta séance du {formatDayMonthLong(next.data.performedOn)}
        </p>
      </div>
      <ul
        aria-label="Suggestions"
        className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-surface"
      >
        {next.data.items.map((item) => {
          const target = targetLabel(item.suggestion, item.equipment);
          const declining = item.suggestion.rule === "declining";
          return (
            <li key={item.exerciseId}>
              <Link
                href={`/exercices/${item.exerciseId}`}
                className="flex flex-col gap-0.5 px-4 py-3 hover:bg-muted"
              >
                <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-[17px] font-bold">{item.name}</span>
                  {target ? (
                    <span
                      className={cn(
                        "text-[17px] font-bold tabular-nums",
                        declining ? "text-regression-ink" : "text-corridor-ink",
                      )}
                    >
                      {target}
                    </span>
                  ) : null}
                </span>
                <span className="text-[15px] text-muted-foreground">{item.text}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
