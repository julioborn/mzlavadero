import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OwnerNav from "@/components/OwnerNav";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  if (profile.role !== "owner") redirect("/employee");

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg-primary)" }}
    >
      <OwnerNav userName={profile.name} />
      <main className="flex-1 overflow-y-auto pb-6">{children}</main>
    </div>
  );
}
