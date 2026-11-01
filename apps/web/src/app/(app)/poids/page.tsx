import type { Metadata } from "next";
import { Page } from "@/components/page";
import { WeightScreen } from "./weight-screen";

export const metadata: Metadata = { title: "Poids · MaRoutine" };

export default function WeightPage() {
  return (
    <Page title="Poids">
      <WeightScreen />
    </Page>
  );
}
