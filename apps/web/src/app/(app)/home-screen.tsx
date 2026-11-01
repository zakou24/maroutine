"use client";

import { addDays, startOfWeek } from "@maroutine/core";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, PencilLine } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { LoadError, Loading } from "@/components/query-state";
import { countLabel, formatDayMonthLong } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useToday } from "@/lib/use-today";
import { workoutsQuery } from "@/lib/workouts-query";
import { ActivityCalendar } from "./activity-calendar";
import { HomeNext } from "./home-next";
import { HomeNutrition } from "./home-nutrition";
import { HomeTrends } from "./home-trends";
import { HomeWeight } from "./home-weight";
import { WorkoutLink } from "./calendrier/calendar-view";

// Accueil, tableau de bord (F-TDB-1) : calendrier d'activité (D17), poids et sa tendance (D23),
// la semaine en cours (séances, jours engagés), les exercices par tendance, la prochaine séance
// et le croisement. Chaque bloc charge seul : un bloc en échec ne masque pas les autres.
export function HomeScreen() {
  const today = useToday();
  if (today === null) return <Loading />;
  return (
    <div className="flex flex-col gap-8">
      <Suspense fallback={null}>
        <SavedNotice />
      </Suspense>
      <ActivityCalendar today={today} />
      <HomeWeight today={today} />
      <Week today={today} />
      <HomeTrends />
      <HomeNext />
      <Link
        href="/croisement"
        className="flex min-h-14 items-center gap-3 rounded-xl border border-rule bg-surface px-4 py-3 hover:bg-muted"
      >
        <span className="flex flex-1 flex-col">
          <span className="text-[17px] font-bold">Croisement</span>
          <span className="text-[15px] text-muted-foreground">
            Tes progressions après des jours bien suivis, et sinon
          </span>
        </span>
        <ChevronRight aria-hidden className="size-5 text-muted-foreground" strokeWidth={2} />
      </Link>
    </div>
  );
}

// Une nouvelle séance enregistrée ramène ici avec ?enregistree=1 (D28) : le message reste quelques
// secondes, l'adresse est nettoyée tout de suite pour qu'un rechargement ne le rejoue pas.
const NOTICE_MS = 5000;

export function SavedNotice() {
  const router = useRouter();
  const saved = useSearchParams().get("enregistree") === "1";
  const [shown, setShown] = useState(false);
  if (saved && !shown) setShown(true);
  // Échéance fixée à l'arrivée : un accueil caché (Activity) suspend ses minuteurs, et le message
  // ne doit pas revenir quand on y retourne après l'échéance (Review Focus 5).
  const deadline = useRef<number | null>(null);

  useEffect(() => {
    if (!saved) return;
    deadline.current ??= Date.now() + NOTICE_MS;
    router.replace("/", { scroll: false });
  }, [saved, router]);

  useEffect(() => {
    if (!shown) return;
    const left = (deadline.current ?? Date.now() + NOTICE_MS) - Date.now();
    const timer = setTimeout(
      () => {
        deadline.current = null;
        setShown(false);
      },
      Math.max(0, left),
    );
    return () => clearTimeout(timer);
  }, [shown]);

  // Région toujours présente, pour que le lecteur d'écran annonce le message quand il apparaît ;
  // vide, elle annule l'espace qui la sépare du calendrier.
  return (
    <p
      role="status"
      className={cn(
        shown ? "rounded-xl bg-corridor px-4 py-3 text-[15px] text-corridor-ink" : "-mb-8",
      )}
    >
      {shown ? "Séance enregistrée." : null}
    </p>
  );
}

function Week({ today }: { today: string }) {
  const start = startOfWeek(today);
  const end = addDays(start, 6);
  const workouts = useQuery(workoutsQuery(start, end));

  const entryLink = (
    <Link
      href="/saisie"
      className="inline-flex h-[52px] items-center justify-center gap-2 rounded-xl bg-action px-5 text-[17px] font-bold text-white hover:bg-action-strong"
    >
      <PencilLine aria-hidden className="size-5" strokeWidth={2} />
      Séance du soir
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
    <section aria-labelledby="week-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="week-title" className="text-[20px] leading-7 font-bold">
          Cette semaine
        </h2>
        <p className="text-[15px] text-muted-foreground">
          Du {formatDayMonthLong(start)} au {formatDayMonthLong(end)}
        </p>
      </div>
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
                <WorkoutLink workout={w} showSets={false} />
              </li>
            ))}
          </ul>
        </>
      )}
      <div>{entryLink}</div>
      <HomeNutrition start={start} today={today} />
    </section>
  );
}
