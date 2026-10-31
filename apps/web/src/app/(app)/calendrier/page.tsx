import type { Metadata } from "next";
import { Suspense } from "react";
import { Page } from "@/components/page";
import { Loading } from "@/components/query-state";
import { CalendarScreen } from "./calendar-screen";

export const metadata: Metadata = { title: "Calendrier · MaRoutine" };

export default function CalendarPage() {
  return (
    <Page title="Calendrier">
      <Suspense fallback={<Loading />}>
        <CalendarScreen />
      </Suspense>
    </Page>
  );
}
