import type { Metadata } from "next";
import { Page } from "@/components/page";
import { TargetsScreen } from "./targets-screen";

export const metadata: Metadata = { title: "Objectifs · MaRoutine" };

export default function TargetsPage() {
  return (
    <Page title="Objectifs">
      <TargetsScreen />
    </Page>
  );
}
