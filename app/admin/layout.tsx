import { requireAdminUser } from "@/lib/admin/require-admin";
import Link from "next/link";

const links = [
  { href: "/admin/rulesets", label: "Rulesets" },
  { href: "/admin/change-requests", label: "Change Requests" },
  { href: "/admin/convention-dates", label: "Convention Dates" },
  { href: "/admin/district-map", label: "District Map" },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminUser();

  return (
    <div className="min-h-screen flex bg-neutral-100 dark:bg-neutral-950">
      <aside className="w-56 shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Admin Panel
          </p>
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mt-1">
            Compliance
          </p>
        </div>
        <nav className="p-3 flex flex-col gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto p-3 border-t border-neutral-200 dark:border-neutral-800">
          <Link
            href="/dashboard"
            className="block text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            ← Dashboard
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
