import { createClient } from "@/lib/supabase/server";
import StatsBar from "@/components/StatsBar";
import MonthSelector from "@/components/MonthSelector";

const MONTHS_ES_FULL = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function waHref(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("54") && d.length >= 11) return `https://wa.me/${d}`;
  const local = d.startsWith("0") ? d.slice(1) : d;
  return `https://wa.me/54${local}`;
}

function startOfWeek() {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d.toISOString().split("T")[0];
}

function currentYearMonth(): string {
  const d = new Date();
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

const WaIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="#25d366">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default async function OwnerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { month: monthParam } = await searchParams;
  const thisMonth = currentYearMonth();

  const supabase = await createClient();

  const { data: allDates } = await supabase
    .from("wash_records")
    .select("wash_date");

  const monthSet = new Set((allDates ?? []).map((r) => r.wash_date.slice(0, 7)));
  monthSet.add(thisMonth);
  const months = [...monthSet].sort().reverse();

  const selectedMonth =
    typeof monthParam === "string" && months.includes(monthParam) ? monthParam : thisMonth;
  const isCurrentMonth = selectedMonth === thisMonth;

  const { start: monthStart, end: monthEnd } = monthBounds(selectedMonth);
  const today = new Date().toISOString().split("T")[0];
  const weekStart = startOfWeek();

  const { data: monthRecords } = await supabase
    .from("wash_records")
    .select("wash_date, wash_time, payment_method, amount, vehicle_id, client_id, vehicles(type)")
    .gte("wash_date", monthStart)
    .lte("wash_date", monthEnd);

  const allMonth = monthRecords ?? [];
  const todayRecs = isCurrentMonth ? allMonth.filter((r) => r.wash_date === today) : [];
  const weekRecs = isCurrentMonth ? allMonth.filter((r) => r.wash_date >= weekStart) : [];

  function sumAmount(arr: typeof allMonth) {
    return arr.reduce((acc, r) => acc + Number(r.amount), 0);
  }

  const stats = {
    today: { count: todayRecs.length, revenue: sumAmount(todayRecs) },
    week:  { count: weekRecs.length,  revenue: sumAmount(weekRecs) },
    month: { count: allMonth.length,  revenue: sumAmount(allMonth) },
  };

  const vehicleBreakdown: Record<string, { count: number; revenue: number }> = {};
  allMonth.forEach((r) => {
    const type = (r.vehicles as any)?.type ?? "desconocido";
    if (!vehicleBreakdown[type]) vehicleBreakdown[type] = { count: 0, revenue: 0 };
    vehicleBreakdown[type].count++;
    vehicleBreakdown[type].revenue += Number(r.amount);
  });

  const payBreakdown: Record<string, { count: number; revenue: number }> = {};
  allMonth.forEach((r) => {
    const m = r.payment_method;
    if (!payBreakdown[m]) payBreakdown[m] = { count: 0, revenue: 0 };
    payBreakdown[m].count++;
    payBreakdown[m].revenue += Number(r.amount);
  });

  const hourCounts: Record<number, number> = {};
  allMonth.forEach((r) => {
    const h = parseInt(r.wash_time.split(":")[0]);
    hourCounts[h] = (hourCounts[h] ?? 0) + 1;
  });
  const peakHours = Object.entries(hourCounts)
    .map(([h, count]) => ({ hour: parseInt(h), count }))
    .sort((a, b) => a.hour - b.hour);
  const maxHourCount = Math.max(...peakHours.map((h) => h.count), 1);

  const clientCounts: Record<string, number> = {};
  allMonth.forEach((r) => {
    if (r.client_id) clientCounts[r.client_id] = (clientCounts[r.client_id] ?? 0) + 1;
  });
  const topClientIds = Object.entries(clientCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ id, count }));

  const { data: topClientData } = topClientIds.length
    ? await supabase.from("clients").select("id, phone").in("id", topClientIds.map((c) => c.id))
    : { data: [] };

  const topClients = topClientIds
    .map((tc) => ({ phone: topClientData?.find((c) => c.id === tc.id)?.phone ?? null, count: tc.count }))
    .filter((c) => c.phone !== null) as { phone: string; count: number }[];

  const maxClientCount = Math.max(...topClients.map((c) => c.count), 1);

  const vehicleTypeLabel: Record<string, string> = {
    auto: "🚗 Auto",
    camioneta: "🚙 Camioneta",
    moto: "🏍️ Moto",
  };

  const sectionTitle = "text-xs font-semibold uppercase tracking-widest mb-4";

  return (
    <div className="px-4 py-6 max-w-2xl mb-9 mx-auto">

      <MonthSelector selected={selectedMonth} months={months} />

      {/* Stat cards */}
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>
        {monthLabel(selectedMonth)}
      </p>

      {isCurrentMonth ? (
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { label: "Hoy",    ...stats.today },
            { label: "Semana", ...stats.week },
            { label: "Mes",    ...stats.month },
          ].map((s) => (
            <div key={s.label} className="card text-center py-4 px-1">
              <p className="text-xs mb-1.5" style={{ color: "var(--text-secondary)" }}>{s.label}</p>
              <p className="text-lg font-bold leading-tight" style={{ color: "var(--warning)" }}>
                ${s.revenue.toLocaleString("es-AR")}
              </p>
              <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--text-secondary)" }}>
                {s.count} lavados
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-5 mb-6">
          <p className="text-xs mb-1.5" style={{ color: "var(--text-secondary)" }}>Total del mes</p>
          <p className="text-2xl font-bold leading-tight" style={{ color: "var(--warning)" }}>
            ${stats.month.revenue.toLocaleString("es-AR")}
          </p>
          <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--text-secondary)" }}>
            {stats.month.count} lavados
          </p>
        </div>
      )}

      {/* Vehicle breakdown */}
      <div className="card mb-3">
        <p className={sectionTitle} style={{ color: "var(--text-secondary)" }}>
          Por vehículo
        </p>
        {Object.keys(vehicleBreakdown).length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Sin datos.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {Object.entries(vehicleBreakdown).map(([type, data]) => (
              <div key={type}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span style={{ color: "var(--text-primary)" }}>{vehicleTypeLabel[type] ?? type}</span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {data.count} · <span style={{ color: "var(--warning)" }}>${data.revenue.toLocaleString("es-AR")}</span>
                  </span>
                </div>
                <StatsBar value={data.count} max={allMonth.length || 1} color="var(--accent)" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment breakdown */}
      <div className="card mb-3">
        <p className={sectionTitle} style={{ color: "var(--text-secondary)" }}>
          Por forma de pago
        </p>
        {Object.keys(payBreakdown).length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Sin datos.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {Object.entries(payBreakdown).map(([method, data]) => (
              <div key={method}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span style={{ color: "var(--text-primary)" }}>
                    {method === "efectivo" ? "Efectivo" : "Transferencia"}
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {data.count} · <span style={{ color: "var(--warning)" }}>${data.revenue.toLocaleString("es-AR")}</span>
                  </span>
                </div>
                <StatsBar
                  value={data.count}
                  max={allMonth.length || 1}
                  color={method === "efectivo" ? "var(--accent)" : "var(--text-secondary)"}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Peak hours */}
      {peakHours.length > 0 && (
        <div className="card mb-3">
          <p className={sectionTitle} style={{ color: "var(--text-secondary)" }}>
            Horarios pico
          </p>
          <div className="flex items-end gap-1" style={{ height: 80 }}>
            {peakHours.map(({ hour, count }) => (
              <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: `${Math.max(6, (count / maxHourCount) * 64)}px`,
                    background: "var(--accent)",
                    opacity: 0.5 + (count / maxHourCount) * 0.5,
                  }}
                />
                <span className="text-xs" style={{ color: "var(--text-secondary)", fontSize: 10 }}>
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
          <p className={sectionTitle} style={{ color: "var(--text-secondary)" }}>
            Clientes frecuentes
          </p>
          <div className="flex flex-col gap-3">
            {topClients.map((c, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1.5">
                  <a
                    href={waHref(c.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 font-medium"
                    style={{ color: "#25d366", textDecoration: "none" }}
                  >
                    <WaIcon />
                    {c.phone}
                  </a>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {c.count} {c.count === 1 ? "visita" : "visitas"}
                  </span>
                </div>
                <StatsBar value={c.count} max={maxClientCount} color="var(--accent)" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
