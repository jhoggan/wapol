import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getCommitteesForSelect } from "@/lib/dashboard/scope";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const email = user.email ?? "Account";
  const committees = await getCommitteesForSelect(supabase);

  return (
    <DashboardShell email={email} committees={committees}>
      {children}
    </DashboardShell>
  );
}
