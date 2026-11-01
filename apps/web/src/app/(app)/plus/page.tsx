import { CalendarDays, Carrot, ChevronRight, Goal, Scale } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@/components/page";
import { LogoutButton } from "./logout-button";

export const metadata: Metadata = { title: "Plus · MaRoutine" };

const LINKS = [
  { href: "/poids", label: "Poids", icon: Scale },
  { href: "/objectifs", label: "Objectifs", icon: Goal },
  { href: "/aliments", label: "Mes aliments", icon: Carrot },
  { href: "/calendrier", label: "Calendrier", icon: CalendarDays },
];

export default function PlusPage() {
  return (
    <Page title="Plus">
      <ul className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-surface">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex min-h-14 items-center gap-3 px-4 text-[17px] hover:bg-muted"
            >
              <Icon aria-hidden className="size-5 text-action" strokeWidth={2} />
              <span className="flex-1">{label}</span>
              <ChevronRight aria-hidden className="size-5 text-muted-foreground" strokeWidth={2} />
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-[13px] text-muted-foreground">
        Données alimentaires{" "}
        <a href="https://world.openfoodfacts.org" className="underline underline-offset-4">
          Open Food Facts
        </a>
        , licence ODbL.
      </p>
      <div>
        <LogoutButton />
      </div>
    </Page>
  );
}
