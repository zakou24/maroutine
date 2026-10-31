// Message d'erreur annoncé aux lecteurs d'écran, dans la couleur réservée aux problèmes.
export function FormError({ children }: { children: string | null }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-[15px] text-regression-ink">
      {children}
    </p>
  );
}
