"use client";

import { targetLabel, type Equipment } from "@maroutine/core";
import { useQuery } from "@tanstack/react-query";
import { suggestionQuery } from "@/lib/stats-queries";
import { cn } from "@/lib/utils";

// Suggestion de la prochaine séance sous les séries préremplies (F-SEA-3), d'après les séances
// d'avant la date de cette séance. Discrète : rien ne s'affiche si elle ne charge pas.
export function SuggestionNote({
  exerciseId,
  equipment,
  before,
}: {
  exerciseId: string;
  equipment: Equipment;
  before: string;
}) {
  const suggestion = useQuery(suggestionQuery(exerciseId, before));
  if (!suggestion.data) return null;
  const target = targetLabel(suggestion.data.suggestion, equipment);
  const declining = suggestion.data.suggestion.rule === "declining";
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded-lg px-3 py-2 text-[15px]",
        declining ? "bg-regression-wash text-regression-ink" : "bg-corridor text-corridor-ink",
      )}
    >
      {target ? <p className="font-bold tabular-nums">Suggestion : {target}</p> : null}
      <p>{suggestion.data.text}</p>
    </div>
  );
}
