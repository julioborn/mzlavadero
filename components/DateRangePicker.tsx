"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const DAYS_ES = ["Lu","Ma","Mi","Ju","Vi","Sa","Do"];

function todayAR(): string {
  return new Date().toLocaleDateString("sv", { timeZone: "America/Argentina/Buenos_Aires" });
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

// Returns Mon=0 … Sun=6
function firstWeekday(y: number, m: number) {
  return (new Date(y, m, 1).getDay() + 6) % 7;
}

function ds(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function fmtDisplay(from: string, to: string): string {
  const fmt = (s: string) => {
    const [y, m, d] = s.split("-");
    return `${parseInt(d)}/${parseInt(m)}/${y.slice(2)}`;
  };
  return `${fmt(from)} → ${fmt(to)}`;
}

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
  const isActive = !!(from && to);

  const initYear = from ? parseInt(from.split("-")[0]) : new Date().getFullYear();
  const initMonth = from ? parseInt(from.split("-")[1]) - 1 : new Date().getMonth();

  const [open, setOpen] = useState(isActive);
  const [calYear, setCalYear] = useState(initYear);
  const [calMonth, setCalMonth] = useState(initMonth);
  const [start, setStart] = useState(from ?? "");
  const [end, setEnd] = useState(to ?? "");
  const [hovered, setHovered] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleDayClick(d: string) {
    if (!start || (start && end)) {
      // Reset: start new selection
      setStart(d);
      setEnd("");
    } else {
      // Second click → set end (swap if needed)
      if (d < start) {
        setEnd(start);
        setStart(d);
      } else {
        setEnd(d);
      }
    }
  }

  function picking() {
    return start && !end;
  }

  // Effective end for highlight preview
  function effectiveEnd() {
    if (end) return end;
    if (picking() && hovered) return hovered >= start ? hovered : start;
    return "";
  }

  function classifyDay(d: string): "start" | "end" | "range" | "none" {
    const lo = start;
    const hi = effectiveEnd();
    if (!lo) return "none";
    if (d === lo && d === hi) return "start";
    if (d === lo) return "start";
    if (d === hi) return "end";
    if (hi && d > lo && d < hi) return "range";
    return "none";
  }

  function apply() {
    if (start && end) {
      router.push(`/owner?from=${start}&to=${end}`);
      setOpen(false);
    }
  }

  function clear() {
    setStart("");
    setEnd("");
    router.push("/owner");
    setOpen(false);
  }

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  }

  // Build grid: nulls for empty leading cells
  const total = daysInMonth(calYear, calMonth);
  const lead = firstWeekday(calYear, calMonth);
  const cells: (number | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = todayAR();
  const hasSelection = !!(start && end);
  const canApply = hasSelection;

  const displayLabel = hasSelection
    ? fmtDisplay(start, end)
    : isActive
    ? fmtDisplay(from!, to!)
    : null;

  return (
    <div ref={containerRef} className="card mb-4">
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2"
      >
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
          Período personalizado
        </span>
        <div className="flex items-center gap-2 min-w-0">
          {displayLabel ? (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full truncate"
              style={{ background: "rgba(229,57,53,0.15)", color: "var(--accent)" }}
            >
              {displayLabel}
            </span>
          ) : (
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Seleccionar
            </span>
          )}
          <span style={{ color: "var(--text-secondary)", flexShrink: 0 }}>
            <ChevronIcon open={open} />
          </span>
        </div>
      </button>

      {/* Calendar panel */}
      {open && (
        <div className="mt-4">
          {/* Phase hint */}
          <p className="text-center text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
            {picking() ? "Seleccioná la fecha final" : "Seleccioná la fecha inicial"}
          </p>

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-lg font-bold"
              style={{ color: "var(--text-secondary)" }}
            >
              ‹
            </button>
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {MONTHS_ES[calMonth]} {calYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-lg font-bold"
              style={{ color: "var(--text-secondary)" }}
            >
              ›
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_ES.map(d => (
              <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: "var(--text-secondary)" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="aspect-square" />;
              const d = ds(calYear, calMonth, day);
              const kind = classifyDay(d);
              const isToday = d === today;
              const isS = kind === "start";
              const isE = kind === "end";
              const inR = kind === "range";
              const onlyOne = hasSelection && start === end && d === start;

              return (
                <div
                  key={i}
                  className="relative flex items-center justify-center"
                  style={{
                    height: 36,
                    // Range band background
                    background: (inR || (isS && !onlyOne) || (isE && !onlyOne))
                      ? "rgba(220,38,38,0.12)"
                      : "transparent",
                    // Clip left half for start, right half for end
                    borderRadius: isS && isE
                      ? 0
                      : isS
                      ? "50% 0 0 50%"
                      : isE
                      ? "0 50% 50% 0"
                      : 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleDayClick(d)}
                    onMouseEnter={() => picking() && setHovered(d)}
                    onMouseLeave={() => setHovered("")}
                    className="flex items-center justify-center text-sm font-medium"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: (isS || isE) ? "var(--accent)" : "transparent",
                      color: (isS || isE)
                        ? "#fff"
                        : isToday
                        ? "var(--accent)"
                        : "var(--text-primary)",
                      fontWeight: isToday ? 700 : undefined,
                      border: isToday && !isS && !isE ? "1.5px solid var(--accent)" : "none",
                      flexShrink: 0,
                    }}
                  >
                    {day}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={apply}
              disabled={!canApply}
              className="btn-primary flex-1"
              style={{ padding: "0.6rem 1rem", fontSize: 14, opacity: canApply ? 1 : 0.4 }}
            >
              Ver período
            </button>
            {(isActive || hasSelection) && (
              <button
                type="button"
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
