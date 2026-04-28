"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "./ThemeToggle";

export default function EmployeeNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      <header
        className="flex items-center justify-between px-4 py-3 sticky top-0 z-10"
        style={{
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-nav)",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden">
            <Image src="/mzlavaderologo.jpeg" alt="MZ" width={32} height={32} className="object-cover" />
          </div>
          <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
            MZ Lavadero
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {userName}
          </span>
          <button
            onClick={logout}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{
              background: "rgba(239,68,68,0.1)",
              color: "var(--danger)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            Salir
          </button>
        </div>
      </header>

      <nav
        className="fixed bottom-0 left-0 right-0 z-10 flex"
        style={{
          background: "var(--bg-surface)",
          borderTop: "1px solid var(--border-nav)",
        }}
      >
        <Link
          href="/employee"
          className="flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium transition-colors"
          style={{ color: pathname === "/employee" ? "var(--accent)" : "var(--text-secondary)" }}
        >
          <span className="text-xl">🏠</span>
          Inicio
        </Link>
        <Link
          href="/employee/new"
          className="flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium transition-colors"
          style={{ color: pathname === "/employee/new" ? "var(--accent)" : "var(--text-secondary)" }}
        >
          <span className="text-xl">＋</span>
          Nuevo
        </Link>
        <Link
          href="/employee/history"
          className="flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium transition-colors"
          style={{ color: pathname === "/employee/history" ? "var(--accent)" : "var(--text-secondary)" }}
        >
          <span className="text-xl">📋</span>
          Historial
        </Link>
      </nav>

      <div className="h-16" />
    </>
  );
}
