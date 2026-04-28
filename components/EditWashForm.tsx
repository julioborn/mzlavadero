"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { VehicleType, PaymentMethod } from "@/lib/types";


export default function EditWashForm({ record }: { record: any }) {
  const router = useRouter();

  const [phone, setPhone] = useState(record.clients?.phone ?? "");
  const [washDate, setWashDate] = useState(record.wash_date);
  const [washTime, setWashTime] = useState(record.wash_time.slice(0, 5));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(record.payment_method);
  const [amount, setAmount] = useState(String(Math.round(record.amount)));
  const [vehicleType, setVehicleType] = useState<VehicleType>(record.vehicles?.type ?? "auto");
  const [plate, setPlate] = useState(record.vehicles?.plate ?? "");
  const [detail, setDetail] = useState(record.detail ?? "");
  const [status, setStatus] = useState<"pending" | "completed">(record.status);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!amount || parseInt(amount) <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }
    if (!plate.trim()) {
      setError("Ingresá la patente.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Upsert client by phone
    let clientId = record.client_id;
    if (phone.trim() && phone.trim() !== record.clients?.phone) {
      let { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("phone", phone.trim())
        .single();
      if (!existingClient) {
        const { data: newClient, error: cErr } = await supabase
          .from("clients")
          .insert({ phone: phone.trim() })
          .select("id")
          .single();
        if (cErr || !newClient) { setError("Error al guardar el cliente."); setLoading(false); return; }
        existingClient = newClient;
      }
      clientId = existingClient.id;
    }

    // Upsert vehicle
    const plateUpper = plate.trim().toUpperCase();
    let vehicleId = record.vehicle_id;
    if (plateUpper !== record.vehicles?.plate || vehicleType !== record.vehicles?.type) {
      let { data: existingVehicle } = await supabase
        .from("vehicles")
        .select("id")
        .eq("plate", plateUpper)
        .single();
      if (!existingVehicle) {
        const { data: newVehicle, error: vErr } = await supabase
          .from("vehicles")
          .insert({ plate: plateUpper, type: vehicleType })
          .select("id")
          .single();
        if (vErr || !newVehicle) { setError("Error al guardar el vehículo."); setLoading(false); return; }
        existingVehicle = newVehicle;
      } else {
        // Update type if plate matches but type changed
        await supabase.from("vehicles").update({ type: vehicleType }).eq("id", existingVehicle.id);
      }
      vehicleId = existingVehicle.id;
      // Upsert link
      await supabase.from("client_vehicles").upsert({ client_id: clientId, vehicle_id: vehicleId });
    }

    const { error: updErr } = await supabase
      .from("wash_records")
      .update({
        client_id: clientId,
        vehicle_id: vehicleId,
        wash_date: washDate,
        wash_time: washTime,
        payment_method: paymentMethod,
        amount: parseInt(amount),
        detail: detail.trim() || null,
        status,
      })
      .eq("id", record.id);

    if (updErr) {
      setError("Error al guardar los cambios.");
      setLoading(false);
      return;
    }

    router.push("/owner/records");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* Phone */}
      <div>
        <label className="label">Teléfono del cliente</label>
        <input
          type="tel"
          inputMode="numeric"
          className="input-field"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      {/* Date & Time */}
      <div className="flex flex-col gap-3">
        <div>
          <label className="label">Fecha</label>
          <input
            type="date"
            className="input-field"
            value={washDate}
            onChange={(e) => setWashDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Hora (24hs)</label>
          <input
            type="time"
            inputMode="numeric"
            className="input-field"
            value={washTime}
            onChange={(e) => setWashTime(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Payment method */}
      <div>
        <label className="label">Forma de pago</label>
        <div className="grid grid-cols-2 gap-3">
          {(["efectivo", "transferencia"] as PaymentMethod[]).map((m) => (
            <button
              key={m}
              type="button"
              className="py-4 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: paymentMethod === m
                  ? (m === "efectivo" ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.1)")
                  : "var(--bg-card)",
                color: paymentMethod === m
                  ? (m === "efectivo" ? "#f87171" : "var(--text-primary)")
                  : "var(--text-secondary)",
                border: paymentMethod === m
                  ? `1.5px solid ${m === "efectivo" ? "#dc2626" : "var(--border-subtle)"}`
                  : "1.5px solid var(--border-subtle)",
              }}
              onClick={() => setPaymentMethod(m)}
            >
              {m === "efectivo" ? "💵 Efectivo" : "🔁 Transferencia"}
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="label">Monto ($)</label>
        <input
          type="text"
          inputMode="numeric"
          className="input-field"
          placeholder="Ej: 20000"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
          required
        />
        {amount && (
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            = ${parseInt(amount).toLocaleString("es-AR")}
          </p>
        )}
      </div>

      {/* Vehicle type */}
      <div>
        <label className="label">Tipo de vehículo</label>
        <div className="grid grid-cols-3 gap-2">
          {(["auto", "camioneta", "moto"] as VehicleType[]).map((t) => (
            <button
              key={t}
              type="button"
              className="py-4 rounded-xl font-medium text-sm flex flex-col items-center gap-1 transition-all"
              style={{
                background: vehicleType === t ? "rgba(220,38,38,0.2)" : "var(--bg-card)",
                color: vehicleType === t ? "var(--accent)" : "var(--text-secondary)",
                border: vehicleType === t ? "1.5px solid var(--accent)" : "1.5px solid rgba(255,255,255,0.08)",
              }}
              onClick={() => setVehicleType(t)}
            >
              <span className="text-2xl">
                {t === "auto" ? "🚗" : t === "camioneta" ? "🚙" : "🏍️"}
              </span>
              <span className="capitalize">{t}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Plate */}
      <div>
        <label className="label">Patente</label>
        <input
          type="text"
          className="input-field"
          value={plate}
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
          required
          autoCapitalize="characters"
          maxLength={10}
          style={{ textTransform: "uppercase" }}
        />
      </div>

      {/* Status */}
      <div>
        <label className="label">Estado</label>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: "pending", label: "🕐 Pendiente" },
            { value: "completed", label: "✅ Realizado" },
          ] as { value: "pending" | "completed"; label: string }[]).map((s) => (
            <button
              key={s.value}
              type="button"
              className="py-3 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: status === s.value
                  ? (s.value === "pending" ? "rgba(245,158,11,0.2)" : "rgba(34,197,94,0.15)")
                  : "var(--bg-card)",
                color: status === s.value
                  ? (s.value === "pending" ? "#f59e0b" : "#4ade80")
                  : "var(--text-secondary)",
                border: status === s.value
                  ? `1.5px solid ${s.value === "pending" ? "rgba(245,158,11,0.4)" : "rgba(34,197,94,0.3)"}`
                  : "1.5px solid var(--border-subtle)",
              }}
              onClick={() => setStatus(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div>
        <label className="label">Observaciones (opcional)</label>
        <textarea
          className="input-field resize-none"
          placeholder="Alguna nota extra..."
          rows={3}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        />
      </div>

      {error && (
        <p
          className="text-sm text-center py-2 px-3 rounded-lg"
          style={{ color: "var(--danger)", background: "rgba(239,68,68,0.1)" }}
        >
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary py-5 text-lg mb-10" disabled={loading}>
        {loading ? "Guardando..." : "✓ Guardar cambios"}
      </button>
    </form>
  );
}
