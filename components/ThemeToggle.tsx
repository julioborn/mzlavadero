"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Cambiar tema"
      className="text-lg w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
