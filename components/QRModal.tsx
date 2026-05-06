"use client";

import { useState } from "react";
import Image from "next/image";

const QRIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3zM17 17h3v3h-3z" />
  </svg>
);

export default function QRModal({ className = "w-full" }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center justify-center gap-2.5 font-semibold text-sm rounded-xl py-3 ${className}`}
        style={{
          background: "var(--bg-elevated)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <QRIcon />
        Cobrar con QR
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="flex flex-col items-center gap-5 w-full max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <p className="text-white font-bold text-xl mb-1">Pagar con MercadoPago</p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                Escaneá el código QR con tu cámara
              </p>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ background: "white", padding: 20 }}>
              <Image
                src="/qrmepa.png"
                alt="QR MercadoPago"
                width={280}
                height={280}
                className="block"
                priority
              />
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-sm font-semibold px-8 py-2.5 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.8)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
