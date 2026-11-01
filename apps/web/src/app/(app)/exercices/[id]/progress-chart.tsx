"use client";

import { formatKg, type CorridorPoint } from "@maroutine/core";
import { Area, Bar, ComposedChart, Line, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { formatDayMonth } from "@/lib/format";

const TICK = { fontSize: 13, fill: "var(--muted-foreground)" };

type Row = { date: string; value?: number; band?: [number, number]; food?: number };

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
  const rows = new Map<string, Row>();
  for (const p of points) {
    rows.set(p.performedOn, { date: p.performedOn, value: p.value, band: [p.low, p.high] });
  }
  // Les barres ne couvrent que la période de la courbe.
  const first = points[0]?.performedOn;
  for (const f of food ?? []) {
    if (first && f.date < first) continue;
    rows.set(f.date, { ...(rows.get(f.date) ?? { date: f.date }), food: f.value });
  }
  const data = [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
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
