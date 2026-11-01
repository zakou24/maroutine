import { expect, it } from "vitest";
import { chartRows } from "@/app/(app)/exercices/[id]/progress-chart";

const point = (workoutId: string, performedOn: string, value: number) => ({
  workoutId,
  performedOn,
  value,
  low: value - 2,
  high: value + 2,
});

it("garde deux séances du même jour, chacune son point (revue du Lot 5)", () => {
  const rows = chartRows([point("a", "2026-10-20", 100), point("b", "2026-10-20", 102)]);
  expect(rows.map((r) => r.value)).toEqual([100, 102]);
});

it("pose l'apport d'un jour sur sa première séance, ajoute les jours sans séance, coupe avant la courbe", () => {
  const rows = chartRows(
    [point("a", "2026-10-20", 100), point("b", "2026-10-20", 102), point("c", "2026-10-25", 104)],
    [
      { date: "2026-10-18", value: 2000 },
      { date: "2026-10-20", value: 2400 },
      { date: "2026-10-22", value: 2100 },
    ],
  );
  expect(rows.map((r) => [r.date, r.value ?? null, r.food ?? null])).toEqual([
    ["2026-10-20", 100, 2400],
    ["2026-10-20", 102, null],
    ["2026-10-22", null, 2100],
    ["2026-10-25", 104, null],
  ]);
});
