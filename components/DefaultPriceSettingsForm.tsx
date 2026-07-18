"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  initialAuto: number;
  initialCamioneta: number;
  initialMoto: number;
}

export default function DefaultPriceSettingsForm({ initialAuto, initialCamioneta, initialMoto }: Props) {
  const supabase = createClient();
  const [priceAuto, setPriceAuto] = useState(String(initialAuto));
  const [priceCamioneta, setPriceCamioneta] = useState(String(initialCamioneta));
  const [priceMoto, setPriceMoto] = useState(String(initialMoto));
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);

    const auto = parseInt(priceAuto) || 0;
    const camioneta = parseInt(priceCamioneta) || 0;
    const moto = parseInt(priceMoto) || 0;

    if (auto < 0 || camioneta < 0 || moto < 0) {
      setError("Los precios no pueden ser negativos.");
      return;
    }

    setLoading(true);
    const { error: err } = await supabase
      .from("app_settings")
      .upsert({
        id: 1,
        price_auto: auto,
        price_camioneta: camioneta,
        price_moto: moto,
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

  const fields = [
    { label: "Auto", value: priceAuto, setValue: setPriceAuto },
    { label: "Camioneta", value: priceCamioneta, setValue: setPriceCamioneta },
    { label: "Moto", value: priceMoto, setValue: setPriceMoto },
  ];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {fields.map((f) => (
        <div key={f.label}>
          <label className="label">Precio lavado normal — {f.label}</label>
          <input
            type="text"
            inputMode="numeric"
            className="input-field"
            placeholder="Ej: 8000"
            value={f.value}
            onChange={(e) => f.setValue(e.target.value.replace(/\D/g, ""))}
          />
          {f.value && parseInt(f.value) > 0 && (
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              = ${parseInt(f.value).toLocaleString("es-AR")}
            </p>
          )}
        </div>
      ))}

      <div
        className="text-xs px-3 py-2.5 rounded-xl"
        style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
      >
        Este monto se autocompleta al elegir el tipo de vehículo en un lavado sin membresía (o cuando un vehículo ya usó sus 4 lavados de membresía del mes). Siempre se puede editar a mano.
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
