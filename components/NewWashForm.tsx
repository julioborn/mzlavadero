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

interface SearchResult {
  id: string;
  name: string | null;
  phone: string;
  vehicles: LinkedVehicle[];
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

  // Unified search (nombre, teléfono o patente)
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Client
  const [phone, setPhone] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [linkedVehicles, setLinkedVehicles] = useState<LinkedVehicle[]>([]);

  // Form fields
  const [washTime, setWashTime] = useState(getNow());
  const [washDate, setWashDate] = useState(getToday());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [amount, setAmount] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType | "">("");
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [plate, setPlate] = useState("");
  const [plateSuggestions, setPlateSuggestions] = useState<LinkedVehicle[]>([]);
  const [showPlateDrop, setShowPlateDrop] = useState(false);
  const [detail, setDetail] = useState("");

  // Membership (por vehículo): se activa automáticamente si el dueño ya
  // registró el pago de la mensualidad de ese vehículo este mes.
  const [isMembership, setIsMembership] = useState(false);
  const [hasMembershipPayment, setHasMembershipPayment] = useState<boolean | null>(null);
  const [membershipCount, setMembershipCount] = useState<number | null>(null);
  const [defaultPrices, setDefaultPrices] = useState({ auto: 0, camioneta: 0, moto: 0 });

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Load prices on mount
  useEffect(() => {
    supabase
      .from("app_settings")
      .select("price_auto, price_camioneta, price_moto")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) {
          setDefaultPrices({
            auto: data.price_auto,
            camioneta: data.price_camioneta,
            moto: data.price_moto,
          });
        }
      });
  }, []);

  // Unified search: nombre, teléfono o patente
  useEffect(() => {
    if (search.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDrop(false);
      return;
    }
    const timer = setTimeout(async () => {
      const term = search.trim().replace(/[,%]/g, "");
      if (!term) {
        setSearchResults([]);
        setShowSearchDrop(false);
        return;
      }

      const { data: clientRows } = await supabase
        .from("clients")
        .select("id, name, phone")
        .or(`name.ilike.%${term}%,phone.ilike.%${term}%`)
        .limit(8);

      const { data: vehicleRows } = await supabase
        .from("vehicles")
        .select("id, plate, type, client_vehicles(clients(id, name, phone))")
        .ilike("plate", `%${term}%`)
        .limit(8);

      const merged = new Map<string, SearchResult>();

      (clientRows ?? []).forEach((c: any) => {
        merged.set(c.id, { id: c.id, name: c.name, phone: c.phone, vehicles: [] });
      });

      (vehicleRows ?? []).forEach((v: any) => {
        (v.client_vehicles ?? []).forEach((cv: any) => {
          const c = cv.clients;
          if (!c) return;
          if (!merged.has(c.id)) merged.set(c.id, { id: c.id, name: c.name, phone: c.phone, vehicles: [] });
          const entry = merged.get(c.id)!;
          if (!entry.vehicles.some((mv) => mv.id === v.id)) {
            entry.vehicles.push({ id: v.id, plate: v.plate, type: v.type });
          }
        });
      });

      const idsNeedingVehicles = [...merged.values()].filter((m) => m.vehicles.length === 0).map((m) => m.id);
      if (idsNeedingVehicles.length) {
        const { data: cv } = await supabase
          .from("client_vehicles")
          .select("client_id, vehicles(id, plate, type)")
          .in("client_id", idsNeedingVehicles);
        (cv ?? []).forEach((row: any) => {
          if (row.vehicles && merged.has(row.client_id)) {
            merged.get(row.client_id)!.vehicles.push(row.vehicles);
          }
        });
      }

      const list = [...merged.values()];
      setSearchResults(list);
      setShowSearchDrop(list.length > 0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Close search dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDrop(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function getDefaultPriceFill(t: VehicleType): string {
    const price = defaultPrices[t];
    return price > 0 ? String(price) : "";
  }

  // Determina automáticamente si este lavado queda cubierto por la membresía:
  // solo si el dueño ya registró el pago de este vehículo este mes Y todavía
  // no se usaron los 4 lavados incluidos.
  async function checkVehicleMembership(vehId: string, date: string, type: VehicleType) {
    const ym = date.slice(0, 7);
    const { start, end } = getMonthBounds(date);

    const [{ data: payment }, { data: washes }] = await Promise.all([
      supabase.from("membership_payments").select("id").eq("vehicle_id", vehId).eq("month", ym).maybeSingle(),
      supabase
        .from("wash_records")
        .select("id")
        .eq("vehicle_id", vehId)
        .eq("is_membership", true)
        .gte("wash_date", start)
        .lte("wash_date", end),
    ]);

    const paid = !!payment;
    const count = (washes ?? []).length;
    setHasMembershipPayment(paid);
    setMembershipCount(count);

    if (paid && count < 4) {
      setIsMembership(true);
      setAmount("0");
    } else {
      setIsMembership(false);
      setAmount(getDefaultPriceFill(type));
    }
  }

  async function selectVehicle(v: LinkedVehicle) {
    setPlate(v.plate.toUpperCase());
    setVehicleType(v.type);
    setVehicleId(v.id);
    setShowPlateDrop(false);
    await checkVehicleMembership(v.id, washDate, v.type);
  }

  function selectClient(result: SearchResult) {
    setPhone(result.phone);
    setClientName(result.name ?? "");
    setClientId(result.id);
    setLinkedVehicles(result.vehicles);
    setPlateSuggestions(result.vehicles);
    setPlate("");
    setVehicleType("");
    setVehicleId(null);
    setMembershipCount(null);
    setHasMembershipPayment(null);
    setIsMembership(false);
    setShowSearchDrop(false);
    setSearch("");
  }

  async function selectClientVehicle(result: SearchResult, v: LinkedVehicle) {
    setPhone(result.phone);
    setClientName(result.name ?? "");
    setClientId(result.id);
    setLinkedVehicles(result.vehicles);
    setPlateSuggestions(result.vehicles);
    setShowSearchDrop(false);
    setSearch("");
    await selectVehicle(v);
  }

  function handleVehicleTypeSelect(t: VehicleType) {
    setVehicleType(t);
    if (!isMembership) {
      const fill = getDefaultPriceFill(t);
      if (fill !== "") setAmount(fill);
    }
  }

  // Plate input: filtra vehículos vinculados al cliente seleccionado (sugerencias locales)
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

  // Plate lookup: resuelve el vehículo exacto (exista o no un cliente ya elegido)
  useEffect(() => {
    const plateUpper = plate.trim().toUpperCase();
    if (!plateUpper) {
      setVehicleId(null);
      setMembershipCount(null);
      setHasMembershipPayment(null);
      return;
    }
    const timer = setTimeout(async () => {
      const { data: v } = await supabase
        .from("vehicles")
        .select("id, type")
        .eq("plate", plateUpper)
        .single();

      if (v) {
        setVehicleId(v.id);
        setVehicleType(v.type);
        await checkVehicleMembership(v.id, washDate, v.type);

        if (!phone.trim()) {
          const { data: cv } = await supabase
            .from("client_vehicles")
            .select("clients(id, name, phone)")
            .eq("vehicle_id", v.id)
            .limit(1)
            .maybeSingle();
          const c: any = cv?.clients;
          if (c) {
            setPhone(c.phone);
            setClientName(c.name ?? "");
            setClientId(c.id);
          }
        }
      } else {
        setVehicleId(null);
        setMembershipCount(null);
        setHasMembershipPayment(null);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [plate]);

  // Si cambia la fecha del lavado (puede caer en otro mes), re-chequea la membresía
  useEffect(() => {
    if (vehicleId && vehicleType) {
      checkVehicleMembership(vehicleId, washDate, vehicleType as VehicleType);
    }
  }, [washDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!phone.trim()) {
      setError("Ingresá el teléfono del cliente.");
      return;
    }
    if (!vehicleType) {
      setError("Seleccioná el tipo de vehículo.");
      return;
    }
    if (!plate.trim()) {
      setError("Ingresá la patente.");
      return;
    }
    if (!isMembership && (!amount || isNaN(parseInt(amount)) || parseInt(amount) <= 0)) {
      setError("Ingresá un monto válido.");
      return;
    }

    setLoading(true);

    // 1. Upsert client (teléfono + nombre opcional)
    let { data: client } = await supabase
      .from("clients")
      .select("id, name")
      .eq("phone", phone.trim())
      .single();

    if (!client) {
      const { data: newClient, error: clientErr } = await supabase
        .from("clients")
        .insert({ phone: phone.trim(), name: clientName.trim() || null })
        .select("id, name")
        .single();
      if (clientErr || !newClient) {
        setError("Error al guardar el cliente.");
        setLoading(false);
        return;
      }
      client = newClient;
    } else if (clientName.trim() && clientName.trim() !== client.name) {
      await supabase.from("clients").update({ name: clientName.trim() }).eq("id", client.id);
    }
    const finalClientId: string = client.id;

    // 2. Upsert vehicle
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

    // 3. Upsert client_vehicles link
    await supabase
      .from("client_vehicles")
      .upsert({ client_id: finalClientId, vehicle_id: vehicle!.id });

    // 4. Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 5. Membresía: re-chequeo por vehículo (evita condiciones de carrera)
    const ym = washDate.slice(0, 7);
    const { start, end } = getMonthBounds(washDate);
    const [{ data: paymentCheck }, { data: membershipWashes }] = await Promise.all([
      supabase.from("membership_payments").select("id").eq("vehicle_id", vehicle!.id).eq("month", ym).maybeSingle(),
      supabase
        .from("wash_records")
        .select("id")
        .eq("vehicle_id", vehicle!.id)
        .eq("is_membership", true)
        .gte("wash_date", start)
        .lte("wash_date", end),
    ]);

    const finalIsMembership = !!paymentCheck && (membershipWashes ?? []).length < 4;

    if (!finalIsMembership && (!amount || isNaN(parseInt(amount)) || parseInt(amount) <= 0)) {
      setError("Este vehículo ya no tiene lavados de membresía disponibles este mes. Ingresá el monto del lavado normal.");
      setLoading(false);
      return;
    }

    // 6. Determinar estado
    const washDateTime = new Date(`${washDate}T${washTime}:00`);
    const status = washDateTime > new Date() ? "pending" : "completed";

    // 7. Insert wash record
    const { error: recErr } = await supabase.from("wash_records").insert({
      employee_id: user!.id,
      client_id: finalClientId,
      vehicle_id: vehicle!.id,
      wash_date: washDate,
      wash_time: washTime,
      payment_method: paymentMethod,
      amount: finalIsMembership ? 0 : parseInt(amount),
      detail: detail.trim() || null,
      status,
      is_membership: finalIsMembership,
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
                setSearch("");
                setSearchResults([]);
                setPhone("");
                setClientName("");
                setClientId(null);
                setLinkedVehicles([]);
                setWashTime(getNow());
                setWashDate(getToday());
                setPaymentMethod("efectivo");
                setAmount("");
                setVehicleType("");
                setVehicleId(null);
                setPlate("");
                setDetail("");
                setIsMembership(false);
                setHasMembershipPayment(null);
                setMembershipCount(null);
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
        {/* Búsqueda unificada */}
        <div ref={searchRef} className="relative">
          <label className="label">Buscar cliente (nombre, teléfono o patente)</label>
          <input
            type="text"
            className="input-field"
            placeholder="Ej: Juan, 1154321234 o ABC123"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
          {showSearchDrop && (
            <div
              className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-20 shadow-xl"
              style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {searchResults.map((r) => (
                <div key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-sm"
                    style={{ color: "var(--text-primary)" }}
                    onMouseDown={() => selectClient(r)}
                  >
                    <span className="font-semibold">{r.name?.trim() || "Sin nombre"}</span>
                    <span style={{ color: "var(--text-secondary)" }}> · 📱 {r.phone}</span>
                  </button>
                  {r.vehicles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-4 pb-2.5">
                      {r.vehicles.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                          style={{ background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid rgba(255,255,255,0.1)" }}
                          onMouseDown={() => selectClientVehicle(r, v)}
                        >
                          {VEHICLE_LABELS[v.type]} · {v.plate.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Teléfono + Nombre */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Teléfono</label>
            <input
              type="tel"
              inputMode="numeric"
              className="input-field"
              placeholder="Ej: 1154321234"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setClientId(null);
                setLinkedVehicles([]);
              }}
              autoComplete="off"
              required
            />
          </div>
          <div>
            <label className="label">
              Nombre <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>(opcional)</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Ej: Juan Pérez"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        {clientId && (
          <p className="text-xs -mt-2" style={{ color: "var(--text-secondary)" }}>
            ✓ Cliente existente
          </p>
        )}

        {linkedVehicles.length > 0 && (
          <div className="flex flex-wrap gap-2">
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

        {/* Membership status — automático, según si el dueño registró el pago */}
        {vehicleId && hasMembershipPayment !== null && (
          hasMembershipPayment ? (
            membershipCount !== null && membershipCount < 4 ? (
              <div
                className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(139,92,246,0.08)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" }}
              >
                <span>✨</span>
                <span>
                  Membresía pagada este mes · lavado {(membershipCount ?? 0) + 1}/4 incluido — <strong>$0</strong>
                </span>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(239,68,68,0.08)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                <span>❌</span>
                <span>Ya usó los 4 lavados incluidos en la membresía este mes · se cobra el lavado normal</span>
              </div>
            )
          ) : (
            <div
              className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl"
              style={{ background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
            >
              <span>ℹ️</span>
              <span>Este vehículo no tiene la membresía de este mes pagada · se cobra como lavado individual</span>
            </div>
          )
        )}

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
          {amount !== "" && (
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              = ${parseInt(amount).toLocaleString("es-AR")}
              {isMembership && " · Incluido en la membresía"}
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
