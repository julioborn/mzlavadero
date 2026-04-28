import { createClient } from "@/lib/supabase/server";
import RecordCard from "@/components/RecordCard";
import Link from "next/link";

const PAGE_SIZE = 10;

export default async function EmployeeHistory({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Todos los pendientes (sin paginar)
  const { data: pending } = await supabase
    .from("wash_records")
    .select(`*, clients(phone), vehicles(plate, type), profiles(name)`)
    .eq("status", "pending")
    .order("wash_date", { ascending: true })
    .order("wash_time", { ascending: true });

  // Realizados con paginación
  const { data: completed, count } = await supabase
    .from("wash_records")
    .select(`*, clients(phone), vehicles(plate, type), profiles(name)`, { count: "exact" })
    .eq("status", "completed")
    .order("wash_date", { ascending: false })
    .order("wash_time", { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div className="px-4 py-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/employee" className="text-2xl leading-none" style={{ color: "var(--text-secondary)" }}>
          ←
        </Link>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Historial de lavados
        </h1>
      </div>

      {/* Sección: Pendientes */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
            🕐 Pendientes
          </h2>
          {pending && pending.length > 0 && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b" }}
            >
              {pending.length}
            </span>
          )}
        </div>

        {pending && pending.length > 0 ? (
          <div className="flex flex-col gap-3">
            {pending.map((r) => (
              <RecordCard key={r.id} record={r} employeeId={user!.id} showDelete />
            ))}
          </div>
        ) : (
          <div className="card text-center py-6" style={{ color: "var(--text-secondary)" }}>
            <p>No hay lavados pendientes.</p>
          </div>
        )}
      </div>

      {/* Sección: Realizados */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
            ✅ Realizados
          </h2>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {count ?? 0} en total
          </span>
        </div>

        {completed && completed.length > 0 ? (
          <>
            <div className="flex flex-col gap-3 mb-6">
              {completed.map((r) => (
                <RecordCard key={r.id} record={r} employeeId={user!.id} showDelete />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                {page > 1 && (
                  <Link
                    href={`/employee/history?page=${page - 1}`}
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
                    href={`/employee/history?page=${page + 1}`}
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
          <div className="card text-center py-6" style={{ color: "var(--text-secondary)" }}>
            <p className="text-4xl mb-3">📋</p>
            <p>No hay lavados realizados todavía.</p>
          </div>
        )}
      </div>
    </div>
  );
}
