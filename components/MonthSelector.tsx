"use client";
import { useRouter } from "next/navigation";

const MONTHS_ES_FULL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  return `${MONTHS_ES_FULL[parseInt(month) - 1]} ${year}`;
}

export default function MonthSelector({ selected, months }: { selected: string; months: string[] }) {
  const router = useRouter();

  return (
    <div className="relative mb-5">
      <select
        value={selected}
        onChange={(e) => router.push(`/owner?month=${e.target.value}`)}
        className="w-full appearance-none rounded-xl px-4 py-3 text-sm font-semibold"
        style={{
          background: "var(--bg-card)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-nav)",
          paddingRight: "2.5rem",
        }}
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {formatLabel(m)}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary)" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}
