// Icône de MaRoutine : un couloir de tendance et une courbe qui monte (direction A).
// `inset` réserve une marge de sécurité pour les icônes « maskable » rognées par le système.
export function IconArt({ size, inset = 0 }: { size: number; inset?: number }) {
  const s = 100;
  const pad = 18 + inset;
  const span = s - pad * 2;
  const x0 = pad;
  const x1 = pad + span;
  const yLow = pad + span * 0.78;
  const yHigh = pad + span * 0.22;
  return (
    <div style={{ width: size, height: size, display: "flex", background: "#F5F7F9" }}>
      <svg width={size} height={size} viewBox={`0 0 ${s} ${s}`}>
        <polygon
          points={`${x0},${yLow - 9} ${x1},${yHigh - 9} ${x1},${yHigh + 9} ${x0},${yLow + 9}`}
          fill="#E3ECF7"
        />
        <polyline
          points={`${x0},${yLow} ${x0 + span * 0.35},${yLow - span * 0.18} ${x0 + span * 0.55},${yLow - span * 0.28} ${x1},${yHigh}`}
          fill="none"
          stroke="#1F5FA8"
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
