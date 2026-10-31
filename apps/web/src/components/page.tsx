import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Gabarit commun des écrans : une colonne de 640 px au plus, le titre et son action à droite.
export function Page({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-5 px-4 pt-8 pb-8 sm:px-6 md:pt-12",
        className,
      )}
    >
      <header className="flex min-h-11 items-center justify-between gap-3">
        <h1 className="text-[28px] leading-[34px] font-bold text-balance">{title}</h1>
        {action}
      </header>
      {children}
    </main>
  );
}
