import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RecordCard from "@/components/RecordCard";

export default async function EmployeeDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date().toISOString().split("T")[0];

  const { data: pending } = await supabase
    .from("wash_records")
    .select(`*, clients(phone), vehicles(plate, type), profiles(name)`)
    .eq("status", "pending")
    .order("wash_date", { ascending: true })
    .order("wash_time", { ascending: true });

  const { data: recent } = await supabase
    .from("wash_records")
    .select(`*, clients(phone), vehicles(plate, type), profiles(name)`)
    .eq("status", "completed")
    .order("wash_date", { ascending: false })
    .order("wash_time", { ascending: false })
    .limit(5);

  const { count: todayCount } = await supabase
    .from("wash_records")
    .select("*", { count: "exact", head: true })
    .eq("wash_date", today)
    .eq("status", "completed");

  return (
    <div className="px-4 py-6 max-w-xl mx-auto">

      {/* Stat card */}
      <div className="card mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: "var(--text-secondary)" }}>
            Realizados hoy
          </p>
          <p className="text-4xl font-bold leading-none" style={{ color: "var(--accent)" }}>
            {todayCount ?? 0}
          </p>
        </div>
      </div>

      {/* Pendientes */}
      {pending && pending.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
              Pendientes
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(245,158,11,0.18)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
              {pending.length}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {pending.map((r) => (
              <RecordCard key={r.id} record={r} employeeId={user!.id} showDelete />
            ))}
          </div>
        </div>
      )}

      {/* Últimos realizados */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
          Últimos realizados
        </h2>
        <Link href="/employee/history"
          className="text-xs font-semibold"
          style={{ color: "var(--accent)" }}>
          Ver todo →
        </Link>
      </div>

      {recent && recent.length > 0 ? (
        <div className="flex flex-col gap-3">
          {recent.map((r) => (
            <RecordCard key={r.id} record={r} employeeId={user!.id} showDelete />
          ))}
        </div>
      ) : (
        <div className="card text-center py-12" style={{ color: "var(--text-secondary)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--bg-elevated)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: "var(--text-secondary)" }}>
              <path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3" />
              <rect x="9" y="11" width="14" height="10" rx="2" />
              <circle cx="12" cy="16" r="1" />
            </svg>
          </div>
          <p className="font-medium text-sm">Todavía no hay lavados registrados.</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>
            Usá el botón + para registrar uno.
          </p>
        </div>
      )}
    </div>
  );
}
