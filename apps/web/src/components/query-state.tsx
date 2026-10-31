import { Button } from "@/components/ui/button";

// États communs d'une lecture : chargement et échec avec un bouton pour réessayer.
export function Loading({ label = "Chargement…" }: { label?: string }) {
  return (
    <p aria-busy="true" className="py-6 text-[15px] text-muted-foreground">
      {label}
    </p>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 py-4">
      <p className="text-[15px] font-bold text-foreground">{message}</p>
      <Button variant="outline" className="h-11 rounded-lg px-4 text-[15px]" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  );
}
