import { createClient } from "@/lib/supabase/server";
import RecordCard from "@/components/RecordCard";
import DateFilterForm from "@/components/DateFilterForm";
import CollapsibleSection from "@/components/CollapsibleSection";
import Link from "next/link";

const PAGE_SIZE = 15;

export default async function OwnerRecords({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; method?: string; type?: string; date?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  // Resolve vehicle IDs if filtering by type
  let vehicleIds: string[] | null = null;
  if (params.type) {
    const { data: vData } = await supabase.from("vehicles").select("id").eq("type", params.type);
    vehicleIds = (vData ?? []).map((v) => v.id);
    if (vehicleIds.length === 0) vehicleIds = ["none"];
  }

  // Resolve client/vehicle IDs matching the search term (nombre, teléfono o patente)
  let matchedClientIds: string[] | null = null;
  let matchedVehicleIds: string[] | null = null;
  if (params.q) {
    const term = params.q.replace(/[,%]/g, "");
    const { data: cRows } = await supabase
      .from("clients")
      .select("id")
      .or(`name.ilike.%${term}%,phone.ilike.%${term}%`);
    matchedClientIds = (cRows ?? []).map((r) => r.id);
    if (matchedClientIds.length === 0) matchedClientIds = ["none"];

    const { data: vRows } = await supabase.from("vehicles").select("id").ilike("plate", `%${term}%`);
    matchedVehicleIds = (vRows ?? []).map((r) => r.id);
    if (matchedVehicleIds.length === 0) matchedVehicleIds = ["none"];
  }

  function applyFilters(q: any) {
    if (params.method) q = q.eq("payment_method", params.method);
    if (params.date)   q = q.eq("wash_date", params.date);
    if (vehicleIds)    q = q.in("vehicle_id", vehicleIds);
    if (matchedClientIds && matchedVehicleIds) {
      q = q.or(`client_id.in.(${matchedClientIds.join(",")}),vehicle_id.in.(${matchedVehicleIds.join(",")})`);
    }
    return q;
  }

  // Pending — all of them, no pagination
  const { data: pending } = await applyFilters(
    supabase
      .from("wash_records")
      .select(`*, clients(phone, name), vehicles(plate, type), profiles(name)`)
      .eq("status", "pending")
      .order("wash_date", { ascending: true })
      .order("wash_time", { ascending: true })
  );

  // Completed — paginated
  const { data: completed, count } = await applyFilters(
    supabase
      .from("wash_records")
      .select(`*, clients(phone, name), vehicles(plate, type), profiles(name)`, { count: "exact" })
      .eq("status", "completed")
      .order("wash_date", { ascending: false })
      .order("wash_time", { ascending: false })
  ).range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p: Record<string, string> = { page: "1" };
    if (params.method) p.method = params.method;
    if (params.type)   p.type   = params.type;
    if (params.date)   p.date   = params.date;
    if (params.q)      p.q      = params.q;
    Object.assign(p, overrides);
    const filtered = Object.fromEntries(
      Object.entries(p).filter(([, v]) => v !== undefined && v !== "")
    ) as Record<string, string>;
    return `/owner/records?${new URLSearchParams(filtered)}`;
  }

  const extraParams: Record<string, string> = {};
  if (params.method) extraParams.method = params.method;
  if (params.type)   extraParams.type   = params.type;
  if (params.q)      extraParams.q      = params.q;

  const hasFilters = !!(params.method || params.type || params.date || params.q);

  return (
    <div className="px-4 py-6 max-w-2xl mb-6 mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Registros</h1>
        <Link
          href="/owner/clients"
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl"
          style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
          Clientes
        </Link>
      </div>

      {/* Search por nombre, teléfono o patente */}
      <form method="GET" action="/owner/records" className="mb-4">
        {params.method && <input type="hidden" name="method" value={params.method} />}
        {params.type && <input type="hidden" name="type" value={params.type} />}
        {params.date && <input type="hidden" name="date" value={params.date} />}
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="16" height="16"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            style={{ color: "var(--text-secondary)" }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search" name="q" defaultValue={params.q ?? ""}
            className="input-field" placeholder="Buscar por nombre, teléfono o patente..."
            style={{ paddingLeft: "2.75rem" }}
          />
        </div>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <DateFilterForm defaultValue={params.date} extraParams={extraParams} />

        {[
          { value: "efectivo",      label: "Efectivo" },
          { value: "transferencia", label: "Transfer" },
        ].map((m) => {
          const active = params.method === m.value;
          return (
            <Link key={m.value} href={buildUrl({ method: active ? undefined : m.value })}
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: active ? "var(--accent)" : "var(--bg-surface)",
                color: active ? "white" : "var(--text-secondary)",
              }}>
              {m.label}
            </Link>
          );
        })}

        {[
          { value: "auto",      label: "🚗 Auto" },
          { value: "camioneta", label: "🚙 Camioneta" },
          { value: "moto",      label: "🏍️ Moto" },
        ].map((t) => {
          const active = params.type === t.value;
          return (
            <Link key={t.value} href={buildUrl({ type: active ? undefined : t.value })}
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: active ? "var(--bg-elevated)" : "var(--bg-surface)",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
                border: `1px solid ${active ? "var(--border-subtle)" : "transparent"}`,
              }}>
              {t.label}
            </Link>
          );
        })}

        {hasFilters && (
          <Link href="/owner/records"
            className="px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: "rgba(248,113,113,0.1)", color: "var(--danger)" }}>
            × Limpiar
          </Link>
        )}
      </div>

      {/* Sección Pendientes */}
      <CollapsibleSection
        title="Pendientes"
        count={pending?.length ?? 0}
        defaultOpen={false}
        countStyle={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}
      >
        {pending && pending.length > 0 ? (
          <div className="flex flex-col gap-3">
            {pending.map((r: any) => (
              <RecordCard key={r.id} record={r} isOwner showDelete />
            ))}
          </div>
        ) : (
          <div className="card text-center py-6" style={{ color: "var(--text-secondary)" }}>
            <p className="text-sm">Sin registros pendientes.</p>
          </div>
        )}
      </CollapsibleSection>

      {/* Sección Realizados */}
      <CollapsibleSection
        title="Realizados"
        count={count ?? 0}
        defaultOpen={false}
      >
        {completed && completed.length > 0 ? (
          <>
            <div className="flex flex-col gap-3 mb-6">
              {completed.map((r: any) => (
                <RecordCard key={r.id} record={r} isOwner showDelete />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pb-2">
                {page > 1 && (
                  <Link href={buildUrl({ page: String(page - 1) })}
                    className="px-4 py-2 rounded-xl text-sm font-medium"
                    style={{ background: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}>
                    ← Anterior
                  </Link>
                )}
                <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  {page} / {totalPages}
                </span>
                {page < totalPages && (
                  <Link href={buildUrl({ page: String(page + 1) })}
                    className="px-4 py-2 rounded-xl text-sm font-medium"
                    style={{ background: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}>
                    Siguiente →
                  </Link>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="card text-center py-6" style={{ color: "var(--text-secondary)" }}>
            <p className="text-sm">Sin registros realizados{hasFilters ? " con esos filtros" : ""}.</p>
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
