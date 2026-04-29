import { createClient } from "@/lib/supabase/server";
import RecordCard from "@/components/RecordCard";
import CollapsibleSection from "@/components/CollapsibleSection";
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

  const { data: pending } = await supabase
    .from("wash_records")
    .select(`*, clients(phone), vehicles(plate, type), profiles(name)`)
    .eq("status", "pending")
    .order("wash_date", { ascending: true })
    .order("wash_time", { ascending: true });

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

      <h1 className="text-xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        Historial
      </h1>

      {/* Pendientes */}
      <CollapsibleSection
        title="Pendientes"
        count={pending?.length ?? 0}
        defaultOpen={false}
        countStyle={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}
      >
        {pending && pending.length > 0 ? (
          <div className="flex flex-col gap-3">
            {pending.map((r) => (
              <RecordCard key={r.id} record={r} employeeId={user!.id} showDelete />
            ))}
          </div>
        ) : (
          <div className="card text-center py-6" style={{ color: "var(--text-secondary)" }}>
            <p className="text-sm font-medium">Sin lavados pendientes.</p>
          </div>
        )}
      </CollapsibleSection>

      {/* Realizados */}
      <CollapsibleSection
        title="Realizados"
        count={count ?? 0}
        defaultOpen={false}
      >
        {completed && completed.length > 0 ? (
          <>
            <div className="flex flex-col gap-3 mb-6">
              {completed.map((r) => (
                <RecordCard key={r.id} record={r} employeeId={user!.id} showDelete />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pb-2">
                {page > 1 && (
                  <Link href={`/employee/history?page=${page - 1}`}
                    className="px-4 py-2 rounded-xl text-sm font-medium"
                    style={{ background: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}>
                    ← Anterior
                  </Link>
                )}
                <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  {page} / {totalPages}
                </span>
                {page < totalPages && (
                  <Link href={`/employee/history?page=${page + 1}`}
                    className="px-4 py-2 rounded-xl text-sm font-medium"
                    style={{ background: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}>
                    Siguiente →
                  </Link>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="card text-center py-10" style={{ color: "var(--text-secondary)" }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--bg-elevated)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ color: "var(--text-secondary)" }}>
                <circle cx="12" cy="12" r="9" />
                <polyline points="12 7 12 12 16 14" />
              </svg>
            </div>
            <p className="font-medium text-sm">Sin lavados realizados todavía.</p>
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
