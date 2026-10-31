import type { Metadata } from "next";
import { WorkoutPage } from "./workout-page";

export const metadata: Metadata = { title: "Séance · MaRoutine" };

// L'identifiant est lu côté client (useParams) : la page reste une coquille statique.
export default function SeancePage() {
  return <WorkoutPage />;
}
