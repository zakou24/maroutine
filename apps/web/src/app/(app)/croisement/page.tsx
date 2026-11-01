import type { Metadata } from "next";
import { Page } from "@/components/page";
import { CrossingScreen } from "./crossing-screen";

export const metadata: Metadata = { title: "Croisement · MaRoutine" };

export default function CrossingPage() {
  return (
    <Page title="Croisement">
      <CrossingScreen />
    </Page>
  );
}
