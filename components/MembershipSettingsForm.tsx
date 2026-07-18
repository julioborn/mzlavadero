"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  initialAuto: number;
  initialCamioneta: number;
}

export default function MembershipSettingsForm({ initialAuto, initialCamioneta }: Props) {
  const supabase = createClient();
  const [priceAuto, setPriceAuto] = useState(String(initialAuto));
  const [priceCamioneta, setPriceCamioneta] = useState(String(initialCamioneta));
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);

    const auto = parseInt(priceAuto) || 0;
    const camioneta = parseInt(priceCamioneta) || 0;

    if (auto < 0 || camioneta < 0) {
      setError("Los precios no pueden ser negativos.");
      return;
    }

    setLoading(true);
    const { error: err } = await supabase
      .from("app_settings")
      .upsert({
        id: 1,
        membership_price_auto: auto,
        membership_price_camioneta: camioneta,
        updated_at: new Date().toISOString(),
      });

    setLoading(false);
    if (err) {
      setError("Error al guardar. Intentá de nuevo.");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className="label">Precio membresía — Auto</label>
        <input
          type="text"
          inputMode="numeric"
          className="input-field"
          placeholder="Ej: 15000"
          value={priceAuto}
          onChange={(e) => setPriceAuto(e.target.value.replace(/\D/g, ""))}
        />
        {priceAuto && parseInt(priceAuto) > 0 && (
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            = ${parseInt(priceAuto).toLocaleString("es-AR")}
          </p>
        )}
      </div>

      <div>
        <label className="label">Precio membresía — Camioneta</label>
        <input
          type="text"
          inputMode="numeric"
          className="input-field"
          placeholder="Ej: 20000"
          value={priceCamioneta}
          onChange={(e) => setPriceCamioneta(e.target.value.replace(/\D/g, ""))}
        />
        {priceCamioneta && parseInt(priceCamioneta) > 0 && (
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            = ${parseInt(priceCamioneta).toLocaleString("es-AR")}
          </p>
        )}
      </div>

      <div
        className="text-xs px-3 py-2.5 rounded-xl"
        style={{ background: "rgba(139,92,246,0.08)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" }}
      >
✨ Este precio se sugiere al registrar el pago mensual desde <strong>"Membresías activas"</strong>. Una vez pagado, hasta <strong>4 lavados</strong> de ese vehículo en el mes se registran en <strong>$0</strong> (ya están cubiertos); el 5° en adelante se cobra como lavado normal. Si un vehículo no tiene el pago del mes registrado, todos sus lavados se cobran como individuales.
      </div>

      {error && (
        <p className="text-sm text-center py-2 px-3 rounded-lg" style={{ color: "var(--danger)", background: "rgba(239,68,68,0.1)" }}>
          {error}
        </p>
      )}

      {saved && (
        <p className="text-sm text-center py-2 px-3 rounded-lg" style={{ color: "#4ade80", background: "rgba(34,197,94,0.1)" }}>
          ✓ Precios guardados correctamente
        </p>
      )}

      <button type="submit" className="btn-primary py-4" disabled={loading}>
        {loading ? "Guardando..." : "Guardar precios"}
      </button>
    </form>
  );
}
