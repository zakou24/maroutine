import { cn } from "@/lib/utils";

// Tailles communes aux formulaires : 44 px de cible au moins, 17 px pour éviter le zoom d'iOS.
export const fieldClass = "h-11 rounded-lg bg-surface text-[17px] md:text-[17px]";

export const selectClass =
  "h-11 w-full rounded-lg border border-input bg-surface px-2.5 text-[17px] text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export const labelClass = "text-[15px] text-muted-foreground";

export const primaryButtonClass =
  "h-[52px] rounded-xl text-[17px] font-bold hover:bg-action-strong";

export const secondaryButtonClass = "h-11 rounded-lg px-4 text-[15px]";

// Bouton à bascule (aria-pressed) : cardio, muscles travaillés, filtres.
export function chipClass(selected: boolean) {
  return cn(
    "h-11 min-w-16 rounded-lg border px-3 text-[15px] tabular-nums",
    selected
      ? "border-action bg-corridor font-bold text-corridor-ink"
      : "border-input bg-surface text-foreground hover:bg-muted",
  );
}
