import { createClient } from "@/lib/supabase/server";
import MonthSelector from "@/components/MonthSelector";
import NewExpenseForm from "@/components/NewExpenseForm";
import ExpenseRow from "@/components/ExpenseRow";
import Link from "next/link";

const MONTHS_ES_FULL = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function nowInArgentina(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
}

function currentYearMonth(): string {
  const d = nowInArgentina();
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

export default async function OwnerExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const thisMonth = currentYearMonth();
  const supabase = await createClient();

  const { data: allDates } = await supabase.from("expenses").select("expense_date");
  const monthSet = new Set((allDates ?? []).map((r) => r.expense_date.slice(0, 7)));
  monthSet.add(thisMonth);
  const months = [...monthSet].sort().reverse();

  const selectedMonth = typeof monthParam === "string" && months.includes(monthParam) ? monthParam : thisMonth;
  const { start, end } = monthBounds(selectedMonth);

  const { data: expenses } = await supabase
    .from("expenses")
    .select("*, profiles(name)")
    .gte("expense_date", start)
    .lte("expense_date", end)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  const list = expenses ?? [];
  const total = list.reduce((acc, e) => acc + Number(e.price) * Number(e.quantity), 0);

  return (
    <div className="px-4 py-6 max-w-2xl mb-6 mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/owner" className="text-2xl leading-none" style={{ color: "var(--text-secondary)" }}>
          ←
        </Link>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Insumos
        </h1>
      </div>

      <div className="card mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-secondary)" }}>
          Nuevo insumo
        </p>
        <NewExpenseForm />
      </div>

      <MonthSelector selected={selectedMonth} months={months} basePath="/owner/expenses" />

      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>
        {monthLabel(selectedMonth)}
      </p>

      <div className="card text-center py-5 mb-6">
        <p className="text-xs mb-1.5" style={{ color: "var(--text-secondary)" }}>Total del mes</p>
        <p className="text-2xl font-bold leading-tight" style={{ color: "var(--danger)" }}>
          ${total.toLocaleString("es-AR")}
        </p>
        <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--text-secondary)" }}>
          {list.length} {list.length === 1 ? "insumo" : "insumos"}
        </p>
      </div>

      {list.length === 0 ? (
        <div className="card text-center py-6" style={{ color: "var(--text-secondary)" }}>
          <p className="text-sm">Sin insumos registrados este mes.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((e: any) => (
            <ExpenseRow key={e.id} expense={e} />
          ))}
        </div>
      )}
    </div>
  );
}
