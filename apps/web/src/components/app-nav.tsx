"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActive } from "./nav-items";

// Barre latérale de l'ordinateur (≥ 768 px).
export function AppNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation principale"
      className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-rule bg-surface px-3 py-6 md:flex"
    >
      <p className="px-3 text-[20px] leading-7 font-bold">MaRoutine</p>
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px]",
                  active
                    ? "bg-corridor font-bold text-corridor-ink"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon aria-hidden className="size-5" strokeWidth={2} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
