import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmployeeNav from "@/components/EmployeeNav";

export default async function EmployeeLayout({
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
  if (profile.role === "owner") redirect("/owner");

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg-primary)" }}
    >
      <EmployeeNav userName={profile.name} />
      <main className="flex-1 overflow-y-auto pb-6">{children}</main>
    </div>
  );
}
