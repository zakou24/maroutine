import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// Faux au rendu serveur et à l'hydratation, vrai ensuite : pour ce qui dépend du navigateur
// (date du jour, localStorage) sans écart d'hydratation.
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
