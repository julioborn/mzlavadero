"use client";

export default function StatsBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.max(4, Math.round((value / max) * 100));
  return (
    <div
      className="h-2 rounded-full overflow-hidden"
      style={{ background: "rgba(255,255,255,0.07)" }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}
