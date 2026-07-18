"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PaymentMethod } from "@/lib/types";

interface Payment {
  amount: number;
  payment_method: PaymentMethod;
  paid_date: string;
}

function formatDate(date: string) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

function getToday() {
  return new Date().toLocaleDateString("sv", { timeZone: "America/Argentina/Buenos_Aires" });
}

export default function MembershipPaymentStatus({
  vehicleId,
  month,
  payment,
  defaultAmount,
}: {
  vehicleId: string;
  month: string;
  payment: Payment | null;
  defaultAmount: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [amount, setAmount] = useState(defaultAmount > 0 ? String(defaultAmount) : "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [paidDate, setPaidDate] = useState(getToday());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setError("");
    const amountNum = parseInt(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: err } = await supabase.from("membership_payments").upsert(
      {
        vehicle_id: vehicleId,
        month,
        amount: amountNum,
        payment_method: paymentMethod,
        paid_date: paidDate,
        registered_by: user?.id ?? null,
      },
      { onConflict: "vehicle_id,month" }
    );

    setLoading(false);
    if (err) {
      setError("Error al registrar el pago.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function handleRemove() {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("membership_payments").delete().eq("vehicle_id", vehicleId).eq("month", month);
    setLoading(false);
    setConfirmingRemove(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="mt-2 p-3 rounded-xl flex flex-col gap-2.5" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" style={{ marginBottom: 4 }}>Monto ($)</label>
            <input
              type="text"
              inputMode="numeric"
              className="input-field py-1.5 px-2.5 text-xs"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div>
            <label className="label" style={{ marginBottom: 4 }}>Fecha</label>
            <input
              type="date"
              className="input-field py-1.5 px-2.5 text-xs"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["efectivo", "transferencia"] as PaymentMethod[]).map((m) => (
            <button
              key={m}
              type="button"
              className="py-1.5 rounded-lg text-xs font-semibold"
              style={{
                background: paymentMethod === m ? "var(--accent)" : "var(--bg-card)",
                color: paymentMethod === m ? "white" : "var(--text-secondary)",
                border: "1px solid var(--border-subtle)",
              }}
              onClick={() => setPaymentMethod(m)}
            >
              {m === "efectivo" ? "💵 Efectivo" : "🔁 Transferencia"}
            </button>
          ))}
        </div>
        {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 text-xs font-semibold py-1.5 rounded-lg"
            style={{ background: "var(--accent)", color: "white" }}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Guardando..." : "✓ Confirmar pago"}
          </button>
          <button
            type="button"
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ color: "var(--text-secondary)" }}
            onClick={() => setEditing(false)}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (payment) {
    return (
      <div className="mt-2 flex items-center justify-between gap-2 text-xs px-3 py-2 rounded-lg"
        style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
        <span style={{ color: "#4ade80" }}>
          ✓ Pagó ${payment.amount.toLocaleString("es-AR")} · {formatDate(payment.paid_date)} · {payment.payment_method === "efectivo" ? "Efectivo" : "Transferencia"}
        </span>
        {confirmingRemove ? (
          <div className="flex gap-1 flex-shrink-0">
            <button className="font-semibold" style={{ color: "var(--danger)" }} onClick={handleRemove} disabled={loading}>
              Sí, quitar
            </button>
            <button style={{ color: "var(--text-secondary)" }} onClick={() => setConfirmingRemove(false)}>×</button>
          </div>
        ) : (
          <button className="flex-shrink-0" style={{ color: "var(--text-secondary)" }} onClick={() => setConfirmingRemove(true)}>
            Quitar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center justify-between gap-2 text-xs px-3 py-2 rounded-lg"
      style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
      <span style={{ color: "#f59e0b" }}>⏳ Pendiente de pago</span>
      <button
        type="button"
        className="font-semibold px-2.5 py-1 rounded-lg"
        style={{ background: "var(--accent)", color: "white" }}
        onClick={() => setEditing(true)}
      >
        Registrar pago
      </button>
    </div>
  );
}
