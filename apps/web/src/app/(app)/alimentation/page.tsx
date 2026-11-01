import type { Metadata } from "next";
import { Suspense } from "react";
import { Page } from "@/components/page";
import { Loading } from "@/components/query-state";
import { JournalScreen } from "./journal-screen";

export const metadata: Metadata = { title: "Repas · MaRoutine" };

export default function JournalPage() {
  return (
    <Page title="Repas">
      <Suspense fallback={<Loading />}>
        <JournalScreen />
      </Suspense>
    </Page>
  );
}
