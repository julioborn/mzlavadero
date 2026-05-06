"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DateRangePicker({ from, to }: { from?: string; to?: string }) {
  const [fromDate, setFromDate] = useState(from ?? "");
  const [toDate, setToDate] = useState(to ?? "");
  const router = useRouter();

  const isActive = !!from && !!to;
  const canApply = fromDate && toDate && fromDate <= toDate;

  function apply() {
    if (canApply) router.push(`/owner?from=${fromDate}&to=${toDate}`);
  }

  function clear() {
    setFromDate("");
    setToDate("");
    router.push("/owner");
  }

  return (
    <div className="card mb-4">
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>
        Período personalizado
      </p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Desde</p>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="input-field text-sm"
            style={{ padding: "0.6rem 0.75rem" }}
          />
        </div>
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Hasta</p>
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => setToDate(e.target.value)}
            className="input-field text-sm"
            style={{ padding: "0.6rem 0.75rem" }}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={apply}
          disabled={!canApply}
          className="btn-primary flex-1 text-sm"
          style={{ padding: "0.65rem 1rem" }}
        >
          Ver período
        </button>
        {isActive && (
          <button
            onClick={clear}
            className="px-4 rounded-xl text-sm font-semibold"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
