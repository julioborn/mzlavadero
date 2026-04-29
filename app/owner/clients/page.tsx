import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const PAGE_SIZE = 15;

function waHref(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("54") && d.length >= 11) return `https://wa.me/${d}`;
  const local = d.startsWith("0") ? d.slice(1) : d;
  return `https://wa.me/54${local}`;
}

const WaIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="#25d366">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default async function OwnerClients({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  let query = supabase
    .from("clients")
    .select("id, phone, created_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (params.q) query = query.ilike("phone", `%${params.q}%`);

  const { data: clients, count } = await query.range(from, to);

  const enriched = await Promise.all(
    (clients ?? []).map(async (c) => {
      const { data: cvData } = await supabase
        .from("client_vehicles")
        .select("vehicles(plate, type)")
        .eq("client_id", c.id);
      const { count: washCount } = await supabase
        .from("wash_records")
        .select("*", { count: "exact", head: true })
        .eq("client_id", c.id);
      return {
        ...c,
        vehicles: (cvData ?? []).map((row: any) => row.vehicles).filter(Boolean),
        washCount: washCount ?? 0,
      };
    })
  );

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);
  const typeLabel: Record<string, string> = { auto: "🚗", camioneta: "🚙", moto: "🏍️" };

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/owner/records" className="flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0"
          style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold flex-1" style={{ color: "var(--text-primary)" }}>Clientes</h1>
        {count !== null && count > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
            {count}
          </span>
        )}
      </div>

      {/* Search */}
      <form method="GET" action="/owner/clients" className="mb-5">
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="16" height="16"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            style={{ color: "var(--text-secondary)" }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search" name="q" defaultValue={params.q ?? ""}
            className="input-field" placeholder="Buscar por teléfono..."
            style={{ paddingLeft: "2.75rem" }}
          />
        </div>
      </form>

      {enriched.length > 0 ? (
        <>
          <div className="flex flex-col gap-3 mb-6">
            {enriched.map((c) => (
              <div key={c.id} className="card">
                <div className="flex items-start justify-between mb-1">
                  <a href={waHref(c.phone)} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 font-bold text-sm"
                    style={{ color: "#25d366", textDecoration: "none" }}>
                    <WaIcon />
                    {c.phone}
                  </a>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {new Date(c.created_at).toLocaleDateString("es-AR")}
                  </span>
                </div>

                <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
                  {c.washCount} {c.washCount === 1 ? "lavado" : "lavados"} registrados
                </p>

                {c.vehicles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {c.vehicles.map((v: any, i: number) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                        style={{ background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}>
                        {typeLabel[v.type] ?? "🚘"} {v.plate}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pb-2">
              {page > 1 && (
                <Link href={`/owner/clients?page=${page - 1}${params.q ? `&q=${params.q}` : ""}`}
                  className="px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ background: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}>
                  ← Anterior
                </Link>
              )}
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link href={`/owner/clients?page=${page + 1}${params.q ? `&q=${params.q}` : ""}`}
                  className="px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ background: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}>
                  Siguiente →
                </Link>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-14" style={{ color: "var(--text-secondary)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--bg-elevated)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: "var(--text-secondary)" }}>
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <p className="font-medium text-sm">
            {params.q ? "Sin resultados para esa búsqueda." : "No hay clientes registrados."}
          </p>
        </div>
      )}
    </div>
  );
}
