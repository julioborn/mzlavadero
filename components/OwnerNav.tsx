"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "./ThemeToggle";

const IconStats = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V10M12 20V4M6 20v-6" />
  </svg>
);

const IconRecords = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="M9 12h6M9 16h4" />
  </svg>
);

const IconClients = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);

export default function OwnerNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const tabs = [
    { href: "/owner",         label: "Stats",     Icon: IconStats,   match: (p: string) => p === "/owner" },
    { href: "/owner/records", label: "Registros", Icon: IconRecords, match: (p: string) => p.startsWith("/owner/records") || p.startsWith("/owner/clients") },
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
            <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Dueño</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
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
        {/* Stats */}
        {(() => {
          const { href, label, Icon, match } = tabs[0];
          const active = match(pathname);
          return (
            <Link key={href} href={href}
              className="flex-1 flex flex-col items-center justify-end py-3 gap-1 text-xs font-medium relative"
              style={{ color: active ? "var(--accent)" : "var(--text-secondary)" }}>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                  style={{ width: 24, height: 2, background: "var(--accent)" }} />
              )}
              <Icon />
              {label}
            </Link>
          );
        })()}

        {/* Nuevo — FAB central */}
        <Link href="/owner/new" className="flex-1 flex flex-col items-center justify-end pb-2.5 gap-1">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center -mt-5"
            style={{
              background: pathname === "/owner/new" ? "var(--accent-hover)" : "var(--accent)",
              boxShadow: "0 4px 20px rgba(229,57,53,0.4)",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
          <span className="text-xs font-semibold"
            style={{ color: pathname === "/owner/new" ? "var(--accent)" : "var(--text-secondary)" }}>
            Nuevo
          </span>
        </Link>

        {/* Registros */}
        {(() => {
          const { href, label, Icon, match } = tabs[1];
          const active = match(pathname);
          return (
            <Link key={href} href={href}
              className="flex-1 flex flex-col items-center justify-end py-3 gap-1 text-xs font-medium relative"
              style={{ color: active ? "var(--accent)" : "var(--text-secondary)" }}>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                  style={{ width: 24, height: 2, background: "var(--accent)" }} />
              )}
              <Icon />
              {label}
            </Link>
          );
        })()}
      </nav>

      <div className="h-20" />
    </>
  );
}
