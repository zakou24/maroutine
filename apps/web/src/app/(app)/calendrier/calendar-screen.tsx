"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Loading } from "@/components/query-state";
import { useToday } from "@/lib/use-today";
import { CalendarView } from "./calendar-view";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

// Le mois affiché vit dans l'URL (?mois=AAAA-MM) ; par défaut, celui du jour à Paris.
export function CalendarScreen() {
  const today = useToday();
  const params = useSearchParams();
  const router = useRouter();
  if (today === null) return <Loading />;
  const requested = params.get("mois");
  const month = requested && MONTH.test(requested) ? requested : today.slice(0, 7);
  return (
    <CalendarView
      key={month}
      initialMonth={month}
      today={today}
      onMonthChange={(next) => router.replace(`/calendrier?mois=${next}`, { scroll: false })}
    />
  );
}
