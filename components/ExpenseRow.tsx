"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export default function ExpenseRow({ expense }: { expense: any }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("expenses").delete().eq("id", expense.id);
    router.refresh();
  }

  const total = Number(expense.price) * Number(expense.quantity);

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
            {expense.product}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {expense.quantity} × ${Number(expense.price).toLocaleString("es-AR")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold" style={{ color: "var(--danger)" }}>
            ${total.toLocaleString("es-AR")}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {formatDate(expense.expense_date)}
          </p>
        </div>
      </div>

      {expense.profiles?.name && (
        <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
          Registrado por: {expense.profiles.name}
        </p>
      )}

      {confirming ? (
        <div className="flex gap-2 mt-1">
          <button className="btn-danger flex-1 text-xs" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Eliminando..." : "Sí, eliminar"}
          </button>
          <button
            className="flex-1 text-xs py-2 rounded-xl font-medium"
            style={{ background: "var(--bg-card)", color: "var(--text-secondary)" }}
            onClick={() => setConfirming(false)}
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button className="btn-danger w-full text-xs mt-1" onClick={() => setConfirming(true)}>
          Eliminar
        </button>
      )}
    </div>
  );
}
