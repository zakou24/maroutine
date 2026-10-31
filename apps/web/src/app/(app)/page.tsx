import type { Metadata } from "next";
import { Page } from "@/components/page";
import { WeekSummary } from "./week-summary";

export const metadata: Metadata = { title: "Cette semaine · MaRoutine" };

export default function HomePage() {
  return (
    <Page title="Cette semaine">
      <WeekSummary />
    </Page>
  );
}
