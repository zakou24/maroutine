import { CalendarDays, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@/components/page";
import { LogoutButton } from "./logout-button";

export const metadata: Metadata = { title: "Plus · MaRoutine" };

export default function PlusPage() {
  return (
    <Page title="Plus">
      <ul className="overflow-hidden rounded-xl border border-rule bg-surface">
        <li>
          <Link
            href="/calendrier"
            className="flex min-h-14 items-center gap-3 px-4 text-[17px] hover:bg-muted"
          >
            <CalendarDays aria-hidden className="size-5 text-action" strokeWidth={2} />
            <span className="flex-1">Calendrier</span>
            <ChevronRight aria-hidden className="size-5 text-muted-foreground" strokeWidth={2} />
          </Link>
        </li>
      </ul>
      <div>
        <LogoutButton />
      </div>
    </Page>
  );
}
