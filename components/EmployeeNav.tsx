"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "./ThemeToggle";

const IconHome = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const IconHistory = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 16 14" />
  </svg>
);

export default function EmployeeNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const tabs = [
    { href: "/employee",         label: "Inicio",   Icon: IconHome,    match: (p: string) => p === "/employee" },
    { href: "/employee/history", label: "Historial", Icon: IconHistory, match: (p: string) => p.startsWith("/employee/history") },
  ];

  return (
    <>
      <header
        className="flex items-center justify-between px-4 py-3 sticky top-0 z-10"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-nav)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0">
            <Image src="/mzlavaderologo.jpeg" alt="MZ" width={32} height={32} className="object-cover" />
          </div>
          <div className="leading-tight">
            <span className="font-bold text-sm block" style={{ color: "var(--text-primary)" }}>MZ Lavadero</span>
            <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{userName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => window.location.reload()}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ background: "rgba(229,57,53,0.15)", color: "var(--accent)", border: "1px solid rgba(229,57,53,0.3)" }}
            title="Recargar página"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 11-2.64-6.36" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
          </button>
          <button
            onClick={logout}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold"
            style={{ background: "rgba(248,113,113,0.1)", color: "var(--danger)", border: "1px solid rgba(248,113,113,0.2)" }}
          >
            Salir
          </button>
        </div>
      </header>

      <nav
        className="fixed bottom-0 left-0 right-0 z-10 flex items-stretch overflow-visible"
        style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border-nav)" }}
      >
        {tabs.slice(0, 1).map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-end py-4 gap-1 text-xs font-medium relative"
              style={{ color: active ? "var(--accent)" : "var(--text-secondary)" }}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                  style={{ width: 24, height: 2, background: "var(--accent)" }} />
              )}
              <Icon />
              {label}
            </Link>
          );
        })}

        {/* Nuevo — FAB central */}
        <Link href="/employee/new" className="flex-1 flex flex-col items-center justify-end pb-3 gap-1">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center -mt-6"
            style={{
              background: pathname === "/employee/new" ? "var(--accent-hover)" : "var(--accent)",
              boxShadow: "0 4px 20px rgba(229,57,53,0.4)",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
          <span className="text-xs font-semibold"
            style={{ color: pathname === "/employee/new" ? "var(--accent)" : "var(--text-secondary)" }}>
            Nuevo
          </span>
        </Link>

        {tabs.slice(1).map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-end py-4 gap-1 text-xs font-medium relative"
              style={{ color: active ? "var(--accent)" : "var(--text-secondary)" }}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                  style={{ width: 24, height: 2, background: "var(--accent)" }} />
              )}
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>

    </>
  );
}
