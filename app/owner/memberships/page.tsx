import { createClient } from "@/lib/supabase/server";
import MonthSelector from "@/components/MonthSelector";
import MembershipPaymentStatus from "@/components/MembershipPaymentStatus";
import Link from "next/link";

const MONTHS_ES_FULL = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function nowInArgentina(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
}

function currentYearMonth(): string {
  const d = nowInArgentina();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthBounds(yearMonth: string): { start: string; end: string } {
  const [y, m] = yearMonth.split("-").map(Number);
  const start = `${yearMonth}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function monthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  return `${MONTHS_ES_FULL[parseInt(month) - 1]} ${year}`;
}

const typeLabel: Record<string, string> = { auto: "🚗 Auto", camioneta: "🚙 Camioneta", moto: "🏍️ Moto" };

export default async function OwnerMembershipsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const thisMonth = currentYearMonth();
  const supabase = await createClient();

  const { data: allMembershipDates } = await supabase
    .from("wash_records")
    .select("wash_date")
    .eq("is_membership", true);
  const monthSet = new Set((allMembershipDates ?? []).map((r) => r.wash_date.slice(0, 7)));
  monthSet.add(thisMonth);
  const months = [...monthSet].sort().reverse();

  const selectedMonth = typeof monthParam === "string" && months.includes(monthParam) ? monthParam : thisMonth;
  const { start, end } = monthBounds(selectedMonth);

  // 1. Lavados con membresía en el período → conteo por vehículo
  const { data: membershipWashes } = await supabase
    .from("wash_records")
    .select("vehicle_id")
    .eq("is_membership", true)
    .gte("wash_date", start)
    .lte("wash_date", end);

  const countByVehicle = new Map<string, number>();
  (membershipWashes ?? []).forEach((r) => {
    countByVehicle.set(r.vehicle_id, (countByVehicle.get(r.vehicle_id) ?? 0) + 1);
  });

  // 2. Pagos de membresía del mes (puede haber pagos registrados de vehículos
  // que todavía no lavaron este mes, así que se incluyen aunque count sea 0)
  const { data: paymentRowsAll } = await supabase
    .from("membership_payments")
    .select("vehicle_id, amount, payment_method, paid_date")
    .eq("month", selectedMonth);

  const paymentByVehicle = new Map(
    (paymentRowsAll ?? []).map((p) => [p.vehicle_id, { amount: Number(p.amount), payment_method: p.payment_method, paid_date: p.paid_date }])
  );

  const vehicleIds = [...new Set([...countByVehicle.keys(), ...paymentByVehicle.keys()])];

  // 3. Precios de membresía (para sugerir el monto de la mensualidad)
  const { data: settings } = await supabase
    .from("app_settings")
    .select("membership_price_auto, membership_price_camioneta")
    .eq("id", 1)
    .single();

  let vehicles: Array<{
    id: string;
    plate: string;
    type: string;
    count: number;
    clientName: string | null;
    clientPhone: string | null;
    payment: { amount: number; payment_method: "efectivo" | "transferencia"; paid_date: string } | null;
    defaultAmount: number;
  }> = [];

  if (vehicleIds.length > 0) {
    const { data: vRows } = await supabase.from("vehicles").select("id, plate, type").in("id", vehicleIds);

    const { data: cvRows } = await supabase
      .from("client_vehicles")
      .select("vehicle_id, clients(name, phone)")
      .in("vehicle_id", vehicleIds);
    const ownerByVehicle = new Map<string, { name: string | null; phone: string | null }>();
    (cvRows ?? []).forEach((row: any) => {
      if (!ownerByVehicle.has(row.vehicle_id) && row.clients) {
        ownerByVehicle.set(row.vehicle_id, { name: row.clients.name, phone: row.clients.phone });
      }
    });

    vehicles = (vRows ?? []).map((v) => {
      const owner = ownerByVehicle.get(v.id);
      const defaultAmount =
        v.type === "auto" ? settings?.membership_price_auto ?? 0 : v.type === "camioneta" ? settings?.membership_price_camioneta ?? 0 : 0;
      return {
        id: v.id,
        plate: v.plate,
        type: v.type,
        count: countByVehicle.get(v.id) ?? 0,
        clientName: owner?.name ?? null,
        clientPhone: owner?.phone ?? null,
        payment: paymentByVehicle.get(v.id) ?? null,
        defaultAmount,
      };
    });

    // Sin pagar primero, luego por más lavados
    vehicles.sort((a, b) => {
      if (!!a.payment !== !!b.payment) return a.payment ? 1 : -1;
      return b.count - a.count;
    });
  }

  const pendingCount = vehicles.filter((v) => !v.payment).length;

  return (
    <div className="px-4 py-6 max-w-2xl mb-6 mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/owner" className="text-2xl leading-none" style={{ color: "var(--text-secondary)" }}>
            ←
          </Link>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Membresías activas
          </h1>
        </div>
        <Link
          href="/owner/settings"
          className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0"
          style={{ background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
          title="Configurar precios"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </Link>
      </div>

      <MonthSelector selected={selectedMonth} months={months} basePath="/owner/memberships" />

      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
          {monthLabel(selectedMonth)}
        </p>
        {vehicles.length > 0 && (
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              background: pendingCount > 0 ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.15)",
              color: pendingCount > 0 ? "#f59e0b" : "#4ade80",
            }}
          >
            {pendingCount > 0 ? `${pendingCount} pendiente${pendingCount === 1 ? "" : "s"}` : "Todos pagaron"}
          </span>
        )}
      </div>

      {vehicles.length === 0 ? (
        <div className="card text-center py-14" style={{ color: "var(--text-secondary)" }}>
          <p className="font-medium text-sm">Ningún vehículo tiene lavados o pago de membresía registrados este mes.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {vehicles.map((v) => (
            <div key={v.id} className="card">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="font-bold text-base tracking-widest" style={{ color: "var(--text-primary)" }}>
                    {v.plate}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {typeLabel[v.type] ?? v.type}
                  </p>
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    background: v.count >= 4 ? "rgba(239,68,68,0.15)" : "rgba(139,92,246,0.15)",
                    color: v.count >= 4 ? "var(--danger)" : "#a78bfa",
                  }}
                >
                  ✨{v.count}/4
                </span>
              </div>

              <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                {v.clientName?.trim() || "Sin nombre"}
                {v.clientPhone && <span style={{ color: "var(--text-secondary)" }}> · 📱 {v.clientPhone}</span>}
              </p>

              <MembershipPaymentStatus
                vehicleId={v.id}
                month={selectedMonth}
                payment={v.payment}
                defaultAmount={v.defaultAmount}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
