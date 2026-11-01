import type { Metadata } from "next";
import { Page } from "@/components/page";
import { CustomFoods } from "./custom-foods";

export const metadata: Metadata = { title: "Mes aliments · MaRoutine" };

export default function CustomFoodsPage() {
  return (
    <Page title="Mes aliments">
      <CustomFoods />
    </Page>
  );
}
