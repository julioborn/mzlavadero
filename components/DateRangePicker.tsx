"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export default function DateRangePicker({ from, to }: { from?: string; to?: string }) {
  const isActive = !!from && !!to;
  const [open, setOpen] = useState(isActive);
  const [fromDate, setFromDate] = useState(from ?? "");
  const [toDate, setToDate] = useState(to ?? "");
  const router = useRouter();

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
      {/* Header / toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between"
        style={{ color: "var(--text-primary)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
            Período personalizado
          </span>
          {isActive && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(229,57,53,0.15)", color: "var(--accent)" }}
            >
              {from} → {to}
            </span>
          )}
        </div>
        <span style={{ color: "var(--text-secondary)" }}>
          <ChevronIcon open={open} />
        </span>
      </button>

      {/* Collapsible body */}
      {open && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold shrink-0 w-10" style={{ color: "var(--text-secondary)" }}>Desde</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="input-field"
              style={{ padding: "0.45rem 0.6rem", fontSize: 14, minWidth: 0 }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold shrink-0 w-10" style={{ color: "var(--text-secondary)" }}>Hasta</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              className="input-field"
              style={{ padding: "0.45rem 0.6rem", fontSize: 14, minWidth: 0 }}
            />
          </div>
          <div className="flex gap-2 mt-1">
            <button
              onClick={apply}
              disabled={!canApply}
              className="btn-primary flex-1"
              style={{ padding: "0.6rem 1rem", fontSize: 14 }}
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
      )}
    </div>
  );
}
