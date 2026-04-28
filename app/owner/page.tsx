import { createClient } from "@/lib/supabase/server";
import StatsBar from "@/components/StatsBar";

function startOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function OwnerDashboard() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();

  // All records for current month (for local aggregation)
  const { data: monthRecords } = await supabase
    .from("wash_records")
    .select("wash_date, wash_time, payment_method, amount, vehicle_id, client_id, vehicles(type)")
    .gte("wash_date", monthStart);

  const allMonth = monthRecords ?? [];
  const todayRecs = allMonth.filter((r) => r.wash_date === today);
  const weekRecs = allMonth.filter((r) => r.wash_date >= weekStart);

  function sumAmount(arr: typeof allMonth) {
    return arr.reduce((acc, r) => acc + Number(r.amount), 0);
  }

  const stats = {
    today: { count: todayRecs.length, revenue: sumAmount(todayRecs) },
    week: { count: weekRecs.length, revenue: sumAmount(weekRecs) },
    month: { count: allMonth.length, revenue: sumAmount(allMonth) },
  };

  // Vehicle type breakdown (month)
  const vehicleBreakdown: Record<string, { count: number; revenue: number }> = {};
  allMonth.forEach((r) => {
    const type = (r.vehicles as any)?.type ?? "desconocido";
    if (!vehicleBreakdown[type]) vehicleBreakdown[type] = { count: 0, revenue: 0 };
    vehicleBreakdown[type].count++;
    vehicleBreakdown[type].revenue += Number(r.amount);
  });

  // Payment method breakdown (month)
  const payBreakdown: Record<string, { count: number; revenue: number }> = {};
  allMonth.forEach((r) => {
    const m = r.payment_method;
    if (!payBreakdown[m]) payBreakdown[m] = { count: 0, revenue: 0 };
    payBreakdown[m].count++;
    payBreakdown[m].revenue += Number(r.amount);
  });

  // Peak hours (month)
  const hourCounts: Record<number, number> = {};
  allMonth.forEach((r) => {
    const h = parseInt(r.wash_time.split(":")[0]);
    hourCounts[h] = (hourCounts[h] ?? 0) + 1;
  });
  const peakHours = Object.entries(hourCounts)
    .map(([h, count]) => ({ hour: parseInt(h), count }))
    .sort((a, b) => a.hour - b.hour);

  const maxHourCount = Math.max(...peakHours.map((h) => h.count), 1);

  // Top clients (month)
  const clientCounts: Record<string, number> = {};
  allMonth.forEach((r) => {
    clientCounts[r.client_id] = (clientCounts[r.client_id] ?? 0) + 1;
  });
  const topClientIds = Object.entries(clientCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ id, count }));

  const { data: topClientData } = topClientIds.length
    ? await supabase
      .from("clients")
      .select("id, phone")
      .in(
        "id",
        topClientIds.map((c) => c.id)
      )
    : { data: [] };

  const topClients = topClientIds.map((tc) => ({
    phone: topClientData?.find((c) => c.id === tc.id)?.phone ?? "—",
    count: tc.count,
  }));

  const maxClientCount = Math.max(...topClients.map((c) => c.count), 1);

  const vehicleTypeLabel: Record<string, string> = {
    auto: "🚗 Auto",
    camioneta: "🚙 Camioneta",
    moto: "🏍️ Moto",
  };

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        Inicio
      </h1>

      {/* Period selector label */}
      <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
        Estadísticas del mes en curso
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { label: "Hoy", ...stats.today },
          { label: "Esta semana", ...stats.week },
          { label: "Este mes", ...stats.month },
        ].map((s) => (
          <div key={s.label} className="card text-center py-4 px-2">
            <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
              {s.label}
            </p>
            <p className="text-xl font-bold" style={{ color: "var(--warning)" }}>
              ${s.revenue.toLocaleString("es-AR")}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              {s.count} lavados
            </p>
          </div>
        ))}
      </div>

      {/* Vehicle type breakdown */}
      <div className="card mb-4">
        <h2 className="font-semibold text-sm mb-4" style={{ color: "var(--text-primary)" }}>
          Por tipo de vehículo (este mes)
        </h2>
        {Object.keys(vehicleBreakdown).length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Sin datos.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {Object.entries(vehicleBreakdown).map(([type, data]) => (
              <div key={type}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: "var(--text-primary)" }}>
                    {vehicleTypeLabel[type] ?? type}
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {data.count} · ${data.revenue.toLocaleString("es-AR")}
                  </span>
                </div>
                <StatsBar value={data.count} max={allMonth.length || 1} color="var(--accent)" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment method breakdown */}
      <div className="card mb-4">
        <h2 className="font-semibold text-sm mb-4" style={{ color: "var(--text-primary)" }}>
          Por forma de pago (este mes)
        </h2>
        {Object.keys(payBreakdown).length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Sin datos.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {Object.entries(payBreakdown).map(([method, data]) => (
              <div key={method}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: "var(--text-primary)" }}>
                    {method === "efectivo" ? "💵 Efectivo" : "🔁 Transferencia"}
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {data.count} · ${data.revenue.toLocaleString("es-AR")}
                  </span>
                </div>
                <StatsBar
                  value={data.count}
                  max={allMonth.length || 1}
                  color={method === "efectivo" ? "#dc2626" : "#e5e5e5"}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Peak hours */}
      {peakHours.length > 0 && (
        <div className="card mb-4">
          <h2 className="font-semibold text-sm mb-4" style={{ color: "var(--text-primary)" }}>
            Horarios pico (este mes)
          </h2>
          <div className="flex items-end gap-1 h-24">
            {peakHours.map(({ hour, count }) => (
              <div
                key={hour}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${Math.max(8, (count / maxHourCount) * 80)}px`,
                    background: "var(--accent)",
                    opacity: 0.7 + (count / maxHourCount) * 0.3,
                  }}
                />
                <span
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {String(hour).padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top clients */}
      {topClients.length > 0 && (
        <div className="card mb-4">
          <h2 className="font-semibold text-sm mb-4" style={{ color: "var(--text-primary)" }}>
            Clientes frecuentes (este mes)
          </h2>
          <div className="flex flex-col gap-3">
            {topClients.map((c, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: "var(--text-primary)" }}>
                    📱 {c.phone}
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {c.count} {c.count === 1 ? "visita" : "visitas"}
                  </span>
                </div>
                <StatsBar value={c.count} max={maxClientCount} color="#dc2626" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
