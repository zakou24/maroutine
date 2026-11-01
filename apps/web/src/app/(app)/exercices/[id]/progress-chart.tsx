"use client";

import { formatKg, type CorridorPoint } from "@maroutine/core";
import { Area, Bar, ComposedChart, Line, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { formatDayMonth } from "@/lib/format";

const TICK = { fontSize: 13, fill: "var(--muted-foreground)" };

type Row = { date: string; value?: number; band?: [number, number]; food?: number };

// Une ligne par séance (deux séances le même jour gardent chacune leur point, F-SEA-6) ; l'apport
// d'un jour se pose sur sa première séance, et les jours sans séance ont leur propre ligne. Les
// barres ne couvrent que la période de la courbe.
export function chartRows(
  points: CorridorPoint[],
  food: { date: string; value: number }[] = [],
): Row[] {
  const rows: Row[] = points.map((p) => ({
    date: p.performedOn,
    value: p.value,
    band: [p.low, p.high],
  }));
  const first = points[0]?.performedOn;
  for (const f of food) {
    if (first && f.date < first) continue;
    const row = rows.find((r) => r.date === f.date);
    if (row) row.food = f.value;
    else rows.push({ date: f.date, food: f.value });
  }
  // Tri stable : les séances d'un même jour gardent leur ordre.
  return rows.sort((x, y) => x.date.localeCompare(y.date));
}

// Courbe du max estimé dans son couloir de tendance (D13, D18), avec en option les calories ou
// les protéines de chaque jour en barres discrètes, sur leur propre échelle (F-TDB-2).
// Décorative pour les lecteurs d'écran : le résumé textuel porte les mêmes chiffres (NF-8).
export function ProgressChart({
  points,
  food,
}: {
  points: CorridorPoint[];
  food?: { date: string; value: number }[];
}) {
  const data = chartRows(points, food);
  return (
    <div aria-hidden className="h-56 w-full tabular-nums">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          accessibilityLayer={false}
        >
          <XAxis
            dataKey="date"
            tickFormatter={formatDayMonth}
            tick={TICK}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={["auto", "auto"]}
            width={40}
            tick={TICK}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => formatKg(v)}
          />
          {food ? <YAxis yAxisId="food" hide domain={[0, "auto"]} /> : null}
          {food ? (
            <Bar
              yAxisId="food"
              dataKey="food"
              fill="var(--muted-foreground)"
              fillOpacity={0.25}
              isAnimationActive={false}
            />
          ) : null}
          <Area
            dataKey="band"
            connectNulls
            stroke="none"
            fill="var(--corridor)"
            fillOpacity={1}
            isAnimationActive={false}
          />
          <Line
            dataKey="value"
            type="monotone"
            connectNulls
            stroke="var(--action)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--action)", strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
