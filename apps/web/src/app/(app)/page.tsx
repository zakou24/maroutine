import type { Metadata } from "next";
import { Page } from "@/components/page";
import { HomeScreen } from "./home-screen";

export const metadata: Metadata = { title: "Accueil · MaRoutine" };

export default function HomePage() {
  return (
    <Page title="Accueil">
      <HomeScreen />
    </Page>
  );
}
