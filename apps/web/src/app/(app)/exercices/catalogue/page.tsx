import type { Metadata } from "next";
import { Page } from "@/components/page";
import { CatalogPicker } from "./catalog-picker";

export const metadata: Metadata = { title: "Catalogue d'exercices · MaRoutine" };

export default function CatalogPage() {
  return (
    <Page title="Catalogue" className="pb-0">
      <CatalogPicker />
    </Page>
  );
}
