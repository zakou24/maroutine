"use client";

import { crossingText, formatChange, type CrossingGroup } from "@maroutine/core";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { LoadError, Loading } from "@/components/query-state";
import { countLabel } from "@/lib/format";
import { crossingQuery } from "@/lib/stats-queries";

// Croisement (F-TDB-3, F-TDB-4) : progression du max estimé après des fenêtres alimentaires
// engagées et non engagées. Toujours descriptif (§6.8) ; sous le seuil, aucun chiffre.
export function CrossingScreen() {
  const crossing = useQuery(crossingQuery);

  if (crossing.isPending) return <Loading />;
  if (crossing.isError) {
    return (
      <LoadError
        message="Impossible de charger le croisement."
        onRetry={() => crossing.refetch()}
      />
    );
  }
  const { all, byExercise } = crossing.data;

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="crossing-all" className="flex flex-col gap-4">
        <h2 id="crossing-all" className="text-[20px] leading-7 font-bold">
          Tous exercices
        </h2>
        <p className="text-[17px]">{crossingText(all)}</p>
        {all.enough ? (
          <div className="grid grid-cols-2 gap-3">
            <Group label="Après 3 jours bien suivis" group={all.engaged} />
            <Group label="Sinon" group={all.notEngaged} />
          </div>
        ) : null}
        <p className="text-[15px] text-muted-foreground">
          Une comparaison de moyennes, pas une explication : le sommeil, la fatigue ou le programme
          comptent aussi.
        </p>
      </section>

      {byExercise.length > 0 ? (
        <section aria-labelledby="crossing-exercises" className="flex flex-col gap-3">
          <h2 id="crossing-exercises" className="text-[20px] leading-7 font-bold">
            Par exercice
          </h2>
          <ul
            aria-label="Par exercice"
            className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-surface"
          >
            {byExercise.map((item) => (
              <li key={item.exerciseId} className="flex flex-col gap-1 px-4 py-3">
                <Link
                  href={`/exercices/${item.exerciseId}`}
                  className="self-start text-[17px] font-bold text-action underline-offset-4 hover:underline"
                >
                  {item.name}
                </Link>
                <p className="text-[15px]">{crossingText(item.crossing)}</p>
                {/* F-TDB-3 : les comptes de chaque groupe, affichés même sous le seuil. */}
                <p className="text-[13px] text-muted-foreground tabular-nums">
                  Bien suivis : {counts(item.crossing.engaged)} · Sinon :{" "}
                  {counts(item.crossing.notEngaged)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="crossing-how" className="flex flex-col gap-2">
        <h2 id="crossing-how" className="text-[17px] font-bold">
          Comment c&apos;est calculé
        </h2>
        <p className="text-[15px] text-muted-foreground">
          Chaque séance est rapprochée des 3 jours qui la précèdent. Un jour est bien suivi quand
          les protéines atteignent 90 % de l&apos;objectif et que les calories restent à 10 % près.
        </p>
        <p className="text-[15px] text-muted-foreground">
          La progression compare le max estimé à celui de la séance précédente sur le même exercice,
          à 21 jours d&apos;écart au plus. Les chiffres apparaissent à partir de 5 séances dans
          chaque groupe.
        </p>
      </section>
    </div>
  );
}

function counts(group: CrossingGroup) {
  return `${countLabel(group.progressions, "progression", "progressions")} · ${countLabel(group.sessions, "séance", "séances")}`;
}

function Group({ label, group }: { label: string; group: CrossingGroup }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-col gap-1 rounded-xl border border-rule bg-surface px-4 py-3"
    >
      <span className="text-[15px] text-muted-foreground">{label}</span>
      <span className="text-[28px] leading-9 font-bold tabular-nums">
        {group.mean === null ? "—" : formatChange(group.mean)}
      </span>
      <span className="text-[13px] text-muted-foreground tabular-nums">{counts(group)}</span>
    </div>
  );
}
