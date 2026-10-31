"use client";

import { formatKg, type CorridorPoint } from "@maroutine/core";
import { Area, ComposedChart, Line, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { formatDayMonth } from "@/lib/format";

const TICK = { fontSize: 13, fill: "var(--muted-foreground)" };

// Courbe du max estimé dans son couloir de tendance (D13, D18). Décorative pour les lecteurs
// d'écran : le résumé textuel et l'historique portent les mêmes chiffres (NF-8).
export function ProgressChart({ points }: { points: CorridorPoint[] }) {
  const data = points.map((p) => ({ date: p.performedOn, value: p.value, band: [p.low, p.high] }));
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
          <Area
            dataKey="band"
            stroke="none"
            fill="var(--corridor)"
            fillOpacity={1}
            isAnimationActive={false}
          />
          <Line
            dataKey="value"
            type="monotone"
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
