import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import EditWashForm from "@/components/EditWashForm";
import Link from "next/link";

export default async function EditRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: record } = await supabase
    .from("wash_records")
    .select(`*, clients(phone), vehicles(plate, type), profiles(name)`)
    .eq("id", id)
    .single();

  if (!record) notFound();

  return (
    <div className="px-4 py-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/owner/records" className="text-2xl leading-none" style={{ color: "var(--text-secondary)" }}>
          ←
        </Link>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Editar registro
        </h1>
      </div>
      <EditWashForm record={record} />
    </div>
  );
}
