import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RecordCard from "@/components/RecordCard";

export default async function EmployeeDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: records } = await supabase
    .from("wash_records")
    .select(
      `*, clients(phone), vehicles(plate, type), profiles(name)`
    )
    .order("wash_date", { ascending: false })
    .order("wash_time", { ascending: false })
    .limit(5);

  const today = new Date().toISOString().split("T")[0];
  const { count: todayCount } = await supabase
    .from("wash_records")
    .select("*", { count: "exact", head: true })
    .eq("wash_date", today);

  return (
    <div className="px-4 py-6 max-w-xl mx-auto">
      {/* Stats mini */}
      <div
        className="card mb-6 flex items-center justify-between"
      >
        <div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Lavados hoy
          </p>
          <p className="text-3xl font-bold" style={{ color: "var(--accent)" }}>
            {todayCount ?? 0}
          </p>
        </div>
        <div className="text-4xl">🚗</div>
      </div>

      {/* New wash button */}
      <Link href="/employee/new" className="btn-primary mb-8 block text-center text-lg py-5 no-underline">
        ＋ Registrar Lavado
      </Link>

      {/* Recent records */}
      <div className="flex items-center justify-between mb-3">
        <h2
          className="font-semibold text-base"
          style={{ color: "var(--text-primary)" }}
        >
          Últimos registros
        </h2>
        <Link
          href="/employee/history"
          className="text-sm"
          style={{ color: "var(--accent)" }}
        >
          Ver todo →
        </Link>
      </div>

      {records && records.length > 0 ? (
        <div className="flex flex-col gap-3">
          {records.map((r) => (
            <RecordCard key={r.id} record={r} employeeId={user!.id} showDelete />
          ))}
        </div>
      ) : (
        <div
          className="card text-center py-10"
          style={{ color: "var(--text-secondary)" }}
        >
          <p className="text-4xl mb-3">🧼</p>
          <p>Todavía no hay registros hoy.</p>
        </div>
      )}
    </div>
  );
}
