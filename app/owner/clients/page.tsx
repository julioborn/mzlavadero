import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const PAGE_SIZE = 15;

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

  // For each client, get vehicles and wash count
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

  const typeLabel: Record<string, string> = {
    auto: "🚗",
    camioneta: "🚙",
    moto: "🏍️",
  };

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
        Clientes
      </h1>

      {/* Search */}
      <form method="GET" action="/owner/clients" className="mb-4">
        <input
          type="search"
          name="q"
          defaultValue={params.q ?? ""}
          className="input-field"
          placeholder="Buscar por teléfono..."
        />
      </form>

      <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
        {count ?? 0} clientes registrados
      </p>

      {enriched.length > 0 ? (
        <>
          <div className="flex flex-col gap-3 mb-6">
            {enriched.map((c) => (
              <div key={c.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold" style={{ color: "var(--text-primary)" }}>
                      📱 {c.phone}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                      {c.washCount} {c.washCount === 1 ? "lavado" : "lavados"} en total
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {new Date(c.created_at).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                </div>
                {c.vehicles.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {c.vehicles.map((v: any, i: number) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 rounded-lg font-medium"
                        style={{
                          background: "var(--bg-card)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {typeLabel[v.type] ?? "🚘"} {v.plate}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              {page > 1 && (
                <Link
                  href={`/owner/clients?page=${page - 1}${params.q ? `&q=${params.q}` : ""}`}
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
                  href={`/owner/clients?page=${page + 1}${params.q ? `&q=${params.q}` : ""}`}
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
          <p className="text-4xl mb-3">👥</p>
          <p>No hay clientes registrados.</p>
        </div>
      )}
    </div>
  );
}
