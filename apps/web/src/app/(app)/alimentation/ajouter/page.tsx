"use client";

import { MEALS, type Meal } from "@maroutine/core";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Page } from "@/components/page";
import { Loading } from "@/components/query-state";
import { useToday } from "@/lib/use-today";
import { AddEntry } from "./add-entry";

function AddEntryFromUrl() {
  const params = useSearchParams();
  const today = useToday();
  if (today === null) return <Loading />;
  const asked = params.get("date");
  const date = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) && asked <= today ? asked : today;
  const mealParam = params.get("meal");
  const meal = MEALS.includes(mealParam as Meal) ? (mealParam as Meal) : "lunch";
  // La clé repart d'un formulaire vide quand on revient ajouter à un autre repas ou un autre jour.
  return <AddEntry key={`${date}-${meal}`} date={date} meal={meal} />;
}

export default function AddEntryPage() {
  return (
    <Page title="Ajouter">
      <Suspense fallback={<Loading />}>
        <AddEntryFromUrl />
      </Suspense>
    </Page>
  );
}
