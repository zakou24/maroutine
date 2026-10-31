import { CircleAlert } from "lucide-react";

// Message d'erreur annoncé aux lecteurs d'écran. Encre et icône : l'orange reste réservé aux régressions.
export function FormError({ children }: { children: string | null }) {
  if (!children) return null;
  return (
    <p role="alert" className="flex items-start gap-2 text-[15px] font-bold text-foreground">
      <CircleAlert aria-hidden className="mt-0.5 size-[18px] shrink-0" strokeWidth={2} />
      {children}
    </p>
  );
}
