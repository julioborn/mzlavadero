"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "./ThemeProvider";
import type { VehicleType, PaymentMethod } from "@/lib/types";

interface LinkedVehicle {
  id: string;
  plate: string;
  type: VehicleType;
}

const VEHICLE_LABELS: Record<VehicleType, string> = {
  auto: "🚗 Auto",
  camioneta: "🚙 Camioneta",
  moto: "🏍️ Moto",
};

function getNow() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function getToday() {
  return new Date().toLocaleDateString("sv", { timeZone: "America/Argentina/Buenos_Aires" });
}

function getMonthBounds(dateStr: string): { start: string; end: string } {
  const ym = dateStr.slice(0, 7);
  const [y, m] = ym.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { start: `${ym}-01`, end: `${ym}-${String(lastDay).padStart(2, "0")}` };
}

export default function NewWashForm({
  backHref = "/employee",
  homeHref = "/employee",
}: {
  backHref?: string;
  homeHref?: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { theme } = useTheme();

  // Phone autocomplete
  const [phone, setPhone] = useState("");
  const [phoneSuggestions, setPhoneSuggestions] = useState<string[]>([]);
  const [showPhoneDrop, setShowPhoneDrop] = useState(false);
  const [linkedVehicles, setLinkedVehicles] = useState<LinkedVehicle[]>([]);
  const phoneRef = useRef<HTMLDivElement>(null);

  // Form fields
  const [washTime, setWashTime] = useState(getNow());
  const [washDate, setWashDate] = useState(getToday());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [amount, setAmount] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType | "">("");
  const [plate, setPlate] = useState("");
  const [plateSuggestions, setPlateSuggestions] = useState<LinkedVehicle[]>([]);
  const [showPlateDrop, setShowPlateDrop] = useState(false);
  const [detail, setDetail] = useState("");

  // Membership
  const [isMembership, setIsMembership] = useState(false);
  const [membershipPrices, setMembershipPrices] = useState({ auto: 0, camioneta: 0 });
  const [membershipCount, setMembershipCount] = useState<number | null>(null);
  const [membershipClientId, setMembershipClientId] = useState<string | null>(null);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Load membership prices on mount
  useEffect(() => {
    supabase
      .from("app_settings")
      .select("membership_price_auto, membership_price_camioneta")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) {
          setMembershipPrices({
            auto: data.membership_price_auto,
            camioneta: data.membership_price_camioneta,
          });
        }
      });
  }, []);

  // Phone search
  useEffect(() => {
    if (phone.length < 3) {
      setPhoneSuggestions([]);
      setShowPhoneDrop(false);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("clients")
        .select("phone")
        .ilike("phone", `%${phone}%`)
        .limit(6);
      const phones = (data ?? []).map((c) => c.phone);
      setPhoneSuggestions(phones);
      setShowPhoneDrop(phones.length > 0);
    }, 300);
    return () => clearTimeout(timer);
  }, [phone]);

  // Close phone dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (phoneRef.current && !phoneRef.current.contains(e.target as Node)) {
        setShowPhoneDrop(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function checkClientMembership(clientId: string, date: string) {
    const { start, end } = getMonthBounds(date);
    const { data } = await supabase
      .from("wash_records")
      .select("id")
      .eq("client_id", clientId)
      .eq("is_membership", true)
      .gte("wash_date", start)
      .lte("wash_date", end);

    const count = (data ?? []).length;
    setMembershipCount(count);
    if (count > 0 && count < 4) {
      setIsMembership(true);
      // Ya pagó la mensualidad este mes → lavados restantes son $0
      setAmount("0");
    }
  }

  async function selectPhone(p: string) {
    setPhone(p);
    setShowPhoneDrop(false);

    const { data: clientData } = await supabase
      .from("clients")
      .select("id")
      .eq("phone", p)
      .single();

    if (!clientData) {
      setMembershipClientId(null);
      setMembershipCount(null);
      return;
    }

    setMembershipClientId(clientData.id);
    await checkClientMembership(clientData.id, washDate);

    const { data: cvData } = await supabase
      .from("client_vehicles")
      .select("vehicles(id, plate, type)")
      .eq("client_id", clientData.id);
    const vehicles: LinkedVehicle[] = (cvData ?? [])
      .map((row: any) => row.vehicles)
      .filter(Boolean);
    setLinkedVehicles(vehicles);
    setPlateSuggestions(vehicles);
  }

  function selectVehicle(v: LinkedVehicle) {
    setPlate(v.plate.toUpperCase());
    handleVehicleTypeSelect(v.type);
    setShowPlateDrop(false);
  }

  function getMembershipAutoFill(t: VehicleType): string {
    // Si ya tiene lavados con membresía este mes → mensualidad ya pagada → $0
    // Si es el primer lavado del mes con membresía → cobrar mensualidad
    if (membershipCount !== null && membershipCount > 0) return "0";
    const price = t === "auto" ? membershipPrices.auto : t === "camioneta" ? membershipPrices.camioneta : 0;
    return price > 0 ? String(price) : "";
  }

  function handleVehicleTypeSelect(t: VehicleType) {
    setVehicleType(t);
    if (isMembership) {
      const fill = getMembershipAutoFill(t);
      if (fill !== "") setAmount(fill);
    }
  }

  function handleMembershipChange(checked: boolean) {
    setIsMembership(checked);
    if (checked && vehicleType) {
      const fill = getMembershipAutoFill(vehicleType as VehicleType);
      if (fill !== "") setAmount(fill);
    }
  }

  // Plate input: filter linked vehicles
  useEffect(() => {
    if (plate.length > 0 && linkedVehicles.length > 0) {
      const filtered = linkedVehicles.filter((v) =>
        v.plate.toUpperCase().includes(plate.toUpperCase())
      );
      setPlateSuggestions(filtered);
      setShowPlateDrop(filtered.length > 0);
    } else {
      setShowPlateDrop(false);
    }
  }, [plate, linkedVehicles]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!vehicleType) {
      setError("Seleccioná el tipo de vehículo.");
      return;
    }
    if (!plate.trim()) {
      setError("Ingresá la patente.");
      return;
    }
    if (!amount || isNaN(parseInt(amount)) || parseInt(amount) <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }
    if (isMembership && !phone.trim()) {
      setError("La membresía requiere el teléfono del cliente.");
      return;
    }

    setLoading(true);

    // 1. Upsert client
    let clientId: string | null = null;
    if (phone.trim()) {
      let { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("phone", phone.trim())
        .single();

      if (!client) {
        const { data: newClient, error: clientErr } = await supabase
          .from("clients")
          .insert({ phone: phone.trim() })
          .select("id")
          .single();
        if (clientErr || !newClient) {
          setError("Error al guardar el cliente.");
          setLoading(false);
          return;
        }
        client = newClient;
      }
      clientId = client.id;
    }

    // 2. Membership validation
    if (isMembership && clientId) {
      const { start, end } = getMonthBounds(washDate);
      const { data: membershipWashes } = await supabase
        .from("wash_records")
        .select("id")
        .eq("client_id", clientId)
        .eq("is_membership", true)
        .gte("wash_date", start)
        .lte("wash_date", end);

      if ((membershipWashes ?? []).length >= 4) {
        setError("Este cliente ya alcanzó el límite de 4 lavados con membresía este mes.");
        setLoading(false);
        return;
      }
    }

    // 3. Upsert vehicle
    const plateUpper = plate.trim().toUpperCase();
    let { data: vehicle } = await supabase
      .from("vehicles")
      .select("id, type")
      .eq("plate", plateUpper)
      .single();

    if (!vehicle) {
      const { data: newVehicle, error: vErr } = await supabase
        .from("vehicles")
        .insert({ plate: plateUpper, type: vehicleType })
        .select("id, type")
        .single();
      if (vErr || !newVehicle) {
        setError("Error al guardar el vehículo.");
        setLoading(false);
        return;
      }
      vehicle = newVehicle;
    }

    // 4. Upsert client_vehicles link
    if (clientId) {
      await supabase
        .from("client_vehicles")
        .upsert({ client_id: clientId, vehicle_id: vehicle!.id });
    }

    // 5. Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 6. Determinar estado
    const washDateTime = new Date(`${washDate}T${washTime}:00`);
    const status = washDateTime > new Date() ? "pending" : "completed";

    // 7. Insert wash record
    const { error: recErr } = await supabase.from("wash_records").insert({
      employee_id: user!.id,
      client_id: clientId,
      vehicle_id: vehicle!.id,
      wash_date: washDate,
      wash_time: washTime,
      payment_method: paymentMethod,
      amount: parseInt(amount),
      detail: detail.trim() || null,
      status,
      is_membership: isMembership,
    });

    if (recErr) {
      setError("Error al guardar el registro.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "var(--bg-primary)" }}>
        <div className="text-center max-w-sm w-full">
          <div className="text-7xl mb-6">✅</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            ¡Registrado!
          </h2>
          <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
            El lavado fue guardado correctamente.
          </p>
          <div className="flex flex-col gap-3">
            <button
              className="btn-primary"
              onClick={() => {
                setSuccess(false);
                setPhone("");
                setLinkedVehicles([]);
                setWashTime(getNow());
                setWashDate(getToday());
                setPaymentMethod("efectivo");
                setAmount("");
                setVehicleType("");
                setPlate("");
                setDetail("");
                setIsMembership(false);
                setMembershipCount(null);
                setMembershipClientId(null);
              }}
            >
              Registrar otro lavado
            </button>
            <Link
              href={homeHref}
              className="text-center py-3 rounded-xl font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-xl mx-auto mb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={backHref}
          className="text-2xl leading-none"
          style={{ color: "var(--text-secondary)" }}
        >
          ←
        </Link>
        <h1
          className="text-xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Nuevo Lavado
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Phone */}
        <div ref={phoneRef} className="relative">
          <label className="label">Teléfono del cliente <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>(opcional)</span></label>
          <input
            type="tel"
            inputMode="numeric"
            className="input-field"
            placeholder="Ej: 1154321234"
            value={phone}
            onChange={(e) => {
              const val = e.target.value;
              setPhone(val);
              if (!val.trim()) {
                setIsMembership(false);
                setMembershipCount(null);
                setMembershipClientId(null);
                setLinkedVehicles([]);
              }
            }}
            autoComplete="off"
          />
          {showPhoneDrop && (
            <div
              className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-20 shadow-xl"
              style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {phoneSuggestions.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="w-full text-left px-4 py-3 text-sm"
                  style={{ color: "var(--text-primary)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                  onMouseDown={() => selectPhone(p)}
                >
                  📱 {p}
                </button>
              ))}
            </div>
          )}
          {linkedVehicles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {linkedVehicles.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{
                    background: plate.toUpperCase() === v.plate.toUpperCase() ? "var(--accent)" : "var(--bg-card)",
                    color: "var(--text-primary)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                  onClick={() => selectVehicle(v)}
                >
                  {VEHICLE_LABELS[v.type]} · {v.plate.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* Membership status info — solo si tiene lavados con membresía este mes */}
          {membershipCount !== null && membershipCount > 0 && (
            <div
              className="mt-2 flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
              style={{
                background: membershipCount >= 4 ? "rgba(239,68,68,0.08)" : "rgba(139,92,246,0.08)",
                color: membershipCount >= 4 ? "var(--danger)" : "#a78bfa",
                border: `1px solid ${membershipCount >= 4 ? "rgba(239,68,68,0.2)" : "rgba(139,92,246,0.2)"}`,
              }}
            >
              <span>{membershipCount >= 4 ? "❌" : "✨"}</span>
              <span>
                Membresía activa · {membershipCount}/4 lavados este mes
                {membershipCount >= 4 && " · Límite alcanzado"}
              </span>
            </div>
          )}
        </div>

        {/* Membership */}
        <div>
          <label className="label">Membresía</label>
          <div
            className="flex items-center gap-3 py-3 px-4 rounded-xl"
            style={{
              background: "var(--bg-card)",
              border: `1.5px solid ${isMembership ? "rgba(139,92,246,0.4)" : "var(--border-subtle)"}`,
              opacity: (!phone.trim() || (membershipCount !== null && membershipCount >= 4)) ? 0.6 : 1,
            }}
          >
            <input
              type="checkbox"
              id="membership-check"
              checked={isMembership}
              onChange={(e) => handleMembershipChange(e.target.checked)}
              disabled={!phone.trim() || (membershipCount !== null && membershipCount >= 4)}
              className="w-5 h-5 cursor-pointer"
              style={{ accentColor: "#8b5cf6" }}
            />
            <label htmlFor="membership-check" className="flex-1 cursor-pointer select-none">
              <span className="text-sm font-semibold" style={{ color: isMembership ? "#a78bfa" : "var(--text-primary)" }}>
                ✨ Con membresía
              </span>
              {!phone.trim() && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  Ingresá el teléfono para activar
                </p>
              )}
            </label>
          </div>
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
                    ? (m === "efectivo" ? "rgba(220,38,38,0.2)" : theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)")
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
            onChange={(e) => !isMembership && setAmount(e.target.value.replace(/\D/g, ""))}
            readOnly={isMembership}
            style={isMembership ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
            required
          />
          {amount && (
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              = ${parseInt(amount).toLocaleString("es-AR")}
              {isMembership && membershipCount !== null && membershipCount > 0 && " · Lavado incluido en membresía"}
              {isMembership && (membershipCount === null || membershipCount === 0) && " · Mensualidad"}
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
                onClick={() => handleVehicleTypeSelect(t)}
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
        <div className="relative">
          <label className="label">Patente</label>
          <input
            type="text"
            className="input-field"
            placeholder="Ej: ABC123"
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            required
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={10}
            style={{ textTransform: "uppercase" }}
          />
          {showPlateDrop && (
            <div
              className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-20 shadow-xl"
              style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {plateSuggestions.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className="w-full text-left px-4 py-3 text-sm"
                  style={{ color: "var(--text-primary)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                  onMouseDown={() => selectVehicle(v)}
                >
                  {VEHICLE_LABELS[v.type]} · {v.plate.toUpperCase()}
                </button>
              ))}
            </div>
          )}
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
          {loading ? "Guardando..." : "✓ Confirmar Lavado"}
        </button>
      </form>
    </div>
  );
}
