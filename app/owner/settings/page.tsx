import { createClient } from "@/lib/supabase/server";
import MembershipSettingsForm from "@/components/MembershipSettingsForm";
import DefaultPriceSettingsForm from "@/components/DefaultPriceSettingsForm";
import Link from "next/link";

export default async function OwnerSettingsPage() {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("app_settings")
    .select("membership_price_auto, membership_price_camioneta, price_auto, price_camioneta, price_moto")
    .eq("id", 1)
    .single();

  const membershipPriceAuto = settings?.membership_price_auto ?? 0;
  const membershipPriceCamioneta = settings?.membership_price_camioneta ?? 0;
  const priceAuto = settings?.price_auto ?? 0;
  const priceCamioneta = settings?.price_camioneta ?? 0;
  const priceMoto = settings?.price_moto ?? 0;

  return (
    <div className="px-4 py-6 max-w-xl mx-auto mb-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/owner" className="text-2xl leading-none" style={{ color: "var(--text-secondary)" }}>
          ←
        </Link>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Configuración
        </h1>
      </div>

      <div className="card mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-secondary)" }}>
          Precios de membresía
        </p>
        <MembershipSettingsForm initialAuto={membershipPriceAuto} initialCamioneta={membershipPriceCamioneta} />
      </div>

      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-secondary)" }}>
          Precios de lavado normal
        </p>
        <DefaultPriceSettingsForm initialAuto={priceAuto} initialCamioneta={priceCamioneta} initialMoto={priceMoto} />
      </div>
    </div>
  );
}
