import type { Metadata } from "next";
import { Page } from "@/components/page";

export const metadata: Metadata = { title: "Cette semaine · MaRoutine" };

export default function HomePage() {
  return (
    <Page title="Cette semaine">
      <p className="text-[17px] text-muted-foreground">Tes stats arriveront au Lot 2.</p>
    </Page>
  );
}
