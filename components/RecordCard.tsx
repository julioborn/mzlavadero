"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const [confirming, setConfirming] = useState(false);

  const canDelete =
    isOwner || (showDelete && record.employee_id === employeeId);

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("wash_records").delete().eq("id", record.id);
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
    <div className="card">
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`badge-${vehicle?.type ?? "auto"}`}>
              {typeLabel[vehicle?.type] ?? vehicle?.type}
            </span>
            <span
              className={`badge-${record.payment_method}`}
            >
              {record.payment_method === "efectivo" ? "Efectivo" : "Transferencia"}
            </span>
          </div>
          <p
            className="text-lg font-bold mt-1"
            style={{ color: "var(--warning)" }}
          >
            ${parseFloat(record.amount).toLocaleString("es-AR")}
          </p>
        </div>
        <div className="text-right">
          <p
            className="text-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            {formatDate(record.wash_date)}
          </p>
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {formatTime(record.wash_time)} hs
          </p>
        </div>
      </div>

      {/* Vehicle info */}
      <div className="flex items-center gap-3 mb-2">
        <div>
          <p
            className="font-bold text-base tracking-widest"
            style={{ color: "var(--text-primary)" }}
          >
            {vehicle?.plate ?? "—"}
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            📱 {client?.phone ?? "—"}
          </p>
        </div>
      </div>

      {/* Detail */}
      {record.detail && (
        <p
          className="text-sm mt-2 italic"
          style={{ color: "var(--text-secondary)" }}
        >
          &ldquo;{record.detail}&rdquo;
        </p>
      )}

      {/* Employee name (for owner view) */}
      {isOwner && record.profiles?.name && (
        <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
          Empleado: {record.profiles.name}
        </p>
      )}

      {/* Delete */}
      {canDelete && (
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {confirming ? (
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
                onClick={() => setConfirming(false)}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              className="btn-danger w-full text-xs"
              onClick={() => setConfirming(true)}
            >
              Eliminar registro
            </button>
          )}
        </div>
      )}
    </div>
  );
}
