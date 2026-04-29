"use client";

import { useState } from "react";

export default function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  countStyle,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  countStyle?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-8">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full mb-3 text-left"
      >
        <span className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
          {title}
        </span>

        {count !== undefined && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={countStyle ?? { background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
          >
            {count}
          </span>
        )}

        <svg
          className="ml-auto flex-shrink-0"
          style={{
            color: "var(--text-secondary)",
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 0.2s ease",
          }}
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && children}
    </div>
  );
}
