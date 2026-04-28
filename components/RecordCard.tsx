"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface RecordCardProps {
  record: any;
  employeeId?: string;
  showDelete?: boolean;
  isOwner?: boolean;
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function formatTime(time: string) {
  return time.slice(0, 5);
}

export default function RecordCard({
  record,
  employeeId,
  showDelete = false,
  isOwner = false,
}: RecordCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const isPending = record.status === "pending";
  const canDelete = isOwner || (showDelete && record.employee_id === employeeId);
  const canConfirm = isPending && (isOwner || record.employee_id === employeeId);

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("wash_records").delete().eq("id", record.id);
    router.refresh();
  }

  async function handleConfirm() {
    setConfirming(true);
    const supabase = createClient();
    await supabase
      .from("wash_records")
      .update({ status: "completed" })
      .eq("id", record.id);
    router.refresh();
  }

  const vehicle = record.vehicles ?? record.vehicle;
  const client = record.clients ?? record.client;

  const typeLabel: Record<string, string> = {
    auto: "Auto",
    camioneta: "Camioneta",
    moto: "Moto",
  };

  return (
    <div
      className="card"
      style={isPending ? { borderLeft: "3px solid #f59e0b" } : {}}
    >
      {/* Status badge */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={
            isPending
              ? { background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }
              : { background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }
          }
        >
          {isPending ? "🕐 Pendiente" : "✅ Realizado"}
        </span>
      </div>

      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`badge-${vehicle?.type ?? "auto"}`}>
              {typeLabel[vehicle?.type] ?? vehicle?.type}
            </span>
            <span className={`badge-${record.payment_method}`}>
              {record.payment_method === "efectivo" ? "Efectivo" : "Transferencia"}
            </span>
          </div>
          <p className="text-lg font-bold mt-1" style={{ color: "var(--warning)" }}>
            ${parseFloat(record.amount).toLocaleString("es-AR")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {formatDate(record.wash_date)}
          </p>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {formatTime(record.wash_time)} hs
          </p>
        </div>
      </div>

      {/* Vehicle info */}
      <div className="mb-2">
        <p className="font-bold text-base tracking-widest" style={{ color: "var(--text-primary)" }}>
          {vehicle?.plate ?? "—"}
        </p>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          📱 {client?.phone ?? "—"}
        </p>
      </div>

      {record.detail && (
        <p className="text-sm mt-1 italic" style={{ color: "var(--text-secondary)" }}>
          &ldquo;{record.detail}&rdquo;
        </p>
      )}

      {isOwner && record.profiles?.name && (
        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
          Registrado por: {record.profiles.name}
        </p>
      )}

      {/* Actions */}
      {(canConfirm || canDelete || isOwner) && (
        <div className="mt-3 pt-3 flex flex-col gap-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>

          {/* Confirm button */}
          {canConfirm && (
            <button
              className="w-full py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}
              onClick={handleConfirm}
              disabled={confirming}
            >
              {confirming ? "Confirmando..." : "✓ Confirmar lavado"}
            </button>
          )}

          {/* Edit button (owner only) */}
          {isOwner && (
            <Link
              href={`/owner/records/${record.id}/edit`}
              className="block w-full py-2 rounded-xl text-sm font-semibold text-center"
              style={{ background: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}
            >
              ✏️ Editar registro
            </Link>
          )}

          {/* Delete button */}
          {canDelete && (
            confirmingDelete ? (
              <div className="flex gap-2">
                <button
                  className="btn-danger flex-1 text-xs"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Eliminando..." : "Sí, eliminar"}
                </button>
                <button
                  className="flex-1 text-xs py-2 rounded-xl font-medium"
                  style={{ background: "var(--bg-card)", color: "var(--text-secondary)" }}
                  onClick={() => setConfirmingDelete(false)}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                className="btn-danger w-full text-xs"
                onClick={() => setConfirmingDelete(true)}
              >
                Eliminar registro
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
