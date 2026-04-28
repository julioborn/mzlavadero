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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: records, count } = await supabase
    .from("wash_records")
    .select(`*, clients(phone), vehicles(plate, type), profiles(name)`, {
      count: "exact",
    })
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

      <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
        {count ?? 0} registros en total
      </p>

      {records && records.length > 0 ? (
        <>
          <div className="flex flex-col gap-3 mb-6">
            {records.map((r) => (
              <RecordCard key={r.id} record={r} employeeId={user!.id} showDelete />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              {page > 1 && (
                <Link
                  href={`/employee/history?page=${page - 1}`}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{
                    background: "var(--bg-surface)",
                    color: "var(--text-primary)",
                  }}
                >
                  ← Anterior
                </Link>
              )}
              <span
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/employee/history?page=${page + 1}`}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{
                    background: "var(--bg-surface)",
                    color: "var(--text-primary)",
                  }}
                >
                  Siguiente →
                </Link>
              )}
            </div>
          )}
        </>
      ) : (
        <div
          className="card text-center py-10"
          style={{ color: "var(--text-secondary)" }}
        >
          <p className="text-4xl mb-3">📋</p>
          <p>No hay registros todavía.</p>
        </div>
      )}
    </div>
  );
}
