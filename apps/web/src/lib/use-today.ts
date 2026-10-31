import { todayIn } from "@maroutine/core";
import { useSyncExternalStore } from "react";

const TIME_ZONE = "Europe/Paris";

// L'app reste en mémoire d'un soir à l'autre (PWA, écrans gardés cachés par Next.js) :
// la date est relue quand l'app revient au premier plan.
function subscribe(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  window.addEventListener("focus", onChange);
  return () => {
    document.removeEventListener("visibilitychange", onChange);
    window.removeEventListener("focus", onChange);
  };
}

// Date du jour à Paris côté navigateur ; null au rendu serveur et à l'hydratation.
export function useToday(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => todayIn(TIME_ZONE, new Date()),
    () => null,
  );
}
