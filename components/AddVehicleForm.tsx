"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { VehicleType } from "@/lib/types";

const TYPE_LABEL: Record<VehicleType, string> = { auto: "🚗 Auto", camioneta: "🚙 Camioneta", moto: "🏍️ Moto" };

export default function AddVehicleForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [plate, setPlate] = useState("");
  const [type, setType] = useState<VehicleType>("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd() {
    setError("");
    const plateUpper = plate.trim().toUpperCase();
    if (!plateUpper) {
      setError("Ingresá la patente.");
      return;
    }
    setLoading(true);
    const supabase = createClient();

    let { data: vehicle } = await supabase.from("vehicles").select("id").eq("plate", plateUpper).single();
    if (!vehicle) {
      const { data: newVehicle, error: vErr } = await supabase
        .from("vehicles")
        .insert({ plate: plateUpper, type })
        .select("id")
        .single();
      if (vErr || !newVehicle) {
        setError("Error al guardar el vehículo.");
        setLoading(false);
        return;
      }
      vehicle = newVehicle;
    }

    const { error: linkErr } = await supabase.from("client_vehicles").upsert({ client_id: clientId, vehicle_id: vehicle.id });
    setLoading(false);
    if (linkErr) {
      setError("Error al vincular el vehículo.");
      return;
    }

    setPlate("");
    setType("auto");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold px-2.5 py-1 rounded-lg"
        style={{ background: "var(--bg-elevated)", color: "var(--accent)", border: "1px solid var(--border-subtle)" }}
      >
        + Agregar vehículo
      </button>
    );
  }

  return (
    <div className="p-2.5 rounded-lg flex flex-col gap-2 w-full" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
      <input
        type="text"
        className="input-field py-1.5 px-2.5 text-xs"
        placeholder="Patente (ej: ABC123)"
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
          onClick={handleAdd}
          disabled={loading}
        >
          {loading ? "Guardando..." : "✓ Agregar"}
        </button>
        <button
          type="button"
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{ color: "var(--text-secondary)" }}
          onClick={() => {
            setOpen(false);
            setPlate("");
            setError("");
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
