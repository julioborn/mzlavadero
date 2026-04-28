import { createClient } from "@/lib/supabase/server";
import RecordCard from "@/components/RecordCard";
import DateFilterForm from "@/components/DateFilterForm";
import Link from "next/link";

const PAGE_SIZE = 15;

export default async function OwnerRecords({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; method?: string; type?: string; date?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  // If filtering by vehicle type, get matching vehicle IDs first
  let vehicleIds: string[] | null = null;
  if (params.type) {
    const { data: vData } = await supabase
      .from("vehicles")
      .select("id")
      .eq("type", params.type);
    vehicleIds = (vData ?? []).map((v) => v.id);
    if (vehicleIds.length === 0) vehicleIds = ["none"];
  }

  let query = supabase
    .from("wash_records")
    .select(`*, clients(phone), vehicles(plate, type), profiles(name)`, {
      count: "exact",
    })
    .order("wash_date", { ascending: false })
    .order("wash_time", { ascending: false });

  if (params.method) query = query.eq("payment_method", params.method);
  if (params.date) query = query.eq("wash_date", params.date);
  if (vehicleIds) query = query.in("vehicle_id", vehicleIds);

  const { data: records, count } = await query.range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p: Record<string, string> = { page: "1" };
    if (params.method) p.method = params.method;
    if (params.type) p.type = params.type;
    if (params.date) p.date = params.date;
    Object.assign(p, overrides);
    const filtered = Object.fromEntries(
      Object.entries(p).filter(([, v]) => v !== undefined && v !== "")
    ) as Record<string, string>;
    return `/owner/records?${new URLSearchParams(filtered)}`;
  }

  const extraParams: Record<string, string> = {};
  if (params.method) extraParams.method = params.method;
  if (params.type) extraParams.type = params.type;

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
        Todos los registros
      </h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <DateFilterForm defaultValue={params.date} extraParams={extraParams} />

        {["efectivo", "transferencia"].map((m) => (
          <Link
            key={m}
            href={buildUrl({ method: params.method === m ? undefined : m })}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              background: params.method === m ? "var(--accent)" : "var(--bg-surface)",
              color: params.method === m ? "white" : "var(--text-secondary)",
            }}
          >
            {m === "efectivo" ? "💵 Efectivo" : "🔁 Transferencia"}
          </Link>
        ))}

        {["auto", "camioneta", "moto"].map((t) => (
          <Link
            key={t}
            href={buildUrl({ type: params.type === t ? undefined : t })}
            className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize"
            style={{
              background: params.type === t ? "var(--accent)" : "var(--bg-surface)",
              color: params.type === t ? "white" : "var(--text-secondary)",
            }}
          >
            {t === "auto" ? "🚗" : t === "camioneta" ? "🚙" : "🏍️"} {t}
          </Link>
        ))}

        {(params.method || params.type || params.date) && (
          <Link
            href="/owner/records"
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}
          >
            ✕ Limpiar
          </Link>
        )}
      </div>

      <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
        {count ?? 0} registros
      </p>

      {(records ?? []).length > 0 ? (
        <>
          <div className="flex flex-col gap-3 mb-6">
            {(records ?? []).map((r: any) => (
              <RecordCard key={r.id} record={r} isOwner showDelete />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              {page > 1 && (
                <Link
                  href={buildUrl({ page: String(page - 1) })}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}
                >
                  ← Anterior
                </Link>
              )}
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={buildUrl({ page: String(page + 1) })}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}
                >
                  Siguiente →
                </Link>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-10" style={{ color: "var(--text-secondary)" }}>
          <p className="text-4xl mb-3">📋</p>
          <p>No hay registros con esos filtros.</p>
        </div>
      )}
    </div>
  );
}
