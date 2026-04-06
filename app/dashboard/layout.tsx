import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { signOut } from "./actions";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <div className="min-h-screen flex bg-neutral-100 dark:bg-neutral-950">
      <aside className="w-56 shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Utah compliance
          </p>
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mt-1 truncate" title={email}>
            {email}
          </p>
        </div>
        <div className="p-3 flex-1">
          <DashboardNav />
        </div>
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
