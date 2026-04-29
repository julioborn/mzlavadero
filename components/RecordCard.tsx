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

function toWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("54") && digits.length >= 11) return digits;
  const local = digits.startsWith("0") ? digits.slice(1) : digits;
  return `54${local}`;
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
    <div className="card">
      {/* Status badge */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={
            isPending
              ? { background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.22)" }
              : { background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", border: "1px solid rgba(255,255,255,0.1)" }
          }
        >
          {isPending ? "Pendiente" : "Realizado"}
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
        {client?.phone ? (
          <a
            href={`https://wa.me/${toWhatsApp(client.phone)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs flex items-center gap-1 w-fit"
            style={{ color: "#25d366", textDecoration: "none" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#25d366">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {client.phone}
          </a>
        ) : (
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>📱 —</p>
        )}
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
