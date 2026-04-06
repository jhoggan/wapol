import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "./actions";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  return (
    <div className="min-h-screen px-4 py-16 max-w-lg mx-auto">
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-950/80 p-8 shadow-sm space-y-6">
        <div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Signed in as
          </p>
          <p className="text-lg font-medium mt-1 break-all">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
            >
              Sign out
            </button>
          </form>
          <Link
            href="/"
            className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
