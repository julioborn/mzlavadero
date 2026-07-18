"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ClientNameEditor({ clientId, initialName }: { clientId: string; initialName: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("clients").update({ name: name.trim() || null }).eq("id", clientId);
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          className="input-field py-1.5 px-2.5 text-xs"
          style={{ width: 140 }}
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <button
          type="button"
          className="text-xs font-semibold px-2 py-1.5 rounded-lg"
          style={{ background: "var(--accent)", color: "white" }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "..." : "✓"}
        </button>
        <button
          type="button"
          className="text-xs px-2 py-1.5 rounded-lg"
          style={{ color: "var(--text-secondary)" }}
          onClick={() => { setEditing(false); setName(initialName ?? ""); }}
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="flex items-center gap-1.5 text-sm font-semibold"
      style={{ color: initialName ? "var(--text-primary)" : "var(--text-secondary)" }}
      onClick={() => setEditing(true)}
    >
      {initialName?.trim() || "Sin nombre"}
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary)" }}>
        <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5Z" />
      </svg>
    </button>
  );
}
