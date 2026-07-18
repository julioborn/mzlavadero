"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { VehicleType } from "@/lib/types";

const TYPE_LABEL: Record<VehicleType, string> = { auto: "🚗 Auto", camioneta: "🚙 Camioneta", moto: "🏍️ Moto" };

export default function VehicleEditor({
  clientId,
  vehicle,
}: {
  clientId: string;
  vehicle: { id: string; plate: string; type: VehicleType };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [plate, setPlate] = useState(vehicle.plate);
  const [type, setType] = useState<VehicleType>(vehicle.type);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");
    const plateUpper = plate.trim().toUpperCase();
    if (!plateUpper) {
      setError("Ingresá la patente.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.from("vehicles").update({ plate: plateUpper, type }).eq("id", vehicle.id);
    setLoading(false);
    if (err) {
      setError(err.code === "23505" ? "Ya existe otro vehículo con esa patente." : "Error al guardar.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function handleRemove() {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("client_vehicles").delete().eq("client_id", clientId).eq("vehicle_id", vehicle.id);
    setLoading(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-semibold"
        style={{ background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}
      >
        {TYPE_LABEL[vehicle.type]} · {vehicle.plate}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary)" }}>
          <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5Z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="p-2.5 rounded-lg flex flex-col gap-2 w-full" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
      <input
        type="text"
        className="input-field py-1.5 px-2.5 text-xs"
        value={plate}
        onChange={(e) => setPlate(e.target.value.toUpperCase())}
        maxLength={10}
        autoCapitalize="characters"
        style={{ textTransform: "uppercase" }}
      />
      <div className="grid grid-cols-3 gap-1.5">
        {(["auto", "camioneta", "moto"] as VehicleType[]).map((t) => (
          <button
            key={t}
            type="button"
            className="py-1.5 rounded-lg text-xs font-semibold"
            style={{
              background: type === t ? "var(--accent)" : "var(--bg-card)",
              color: type === t ? "white" : "var(--text-secondary)",
              border: "1px solid var(--border-subtle)",
            }}
            onClick={() => setType(t)}
          >
            {TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 text-xs font-semibold py-1.5 rounded-lg"
          style={{ background: "var(--accent)", color: "white" }}
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? "Guardando..." : "✓ Guardar"}
        </button>
        <button
          type="button"
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{ color: "var(--text-secondary)" }}
          onClick={() => {
            setEditing(false);
            setPlate(vehicle.plate);
            setType(vehicle.type);
            setError("");
          }}
        >
          Cancelar
        </button>
      </div>

      {confirmingRemove ? (
        <div className="flex gap-2">
          <button type="button" className="btn-danger flex-1 text-xs" onClick={handleRemove} disabled={loading}>
            {loading ? "Quitando..." : "Sí, quitar"}
          </button>
          <button
            type="button"
            className="flex-1 text-xs py-2 rounded-xl font-medium"
            style={{ background: "var(--bg-card)", color: "var(--text-secondary)" }}
            onClick={() => setConfirmingRemove(false)}
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button type="button" className="text-xs text-left" style={{ color: "var(--danger)" }} onClick={() => setConfirmingRemove(true)}>
          Quitar vehículo de este cliente
        </button>
      )}
    </div>
  );
}
