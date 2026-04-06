"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CommitteeOption } from "@/lib/dashboard/scope";
import { signOut } from "@/app/dashboard/actions";
import {
  ActiveCommitteeProvider,
  useActiveCommittee,
} from "./active-committee-context";

function linkActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/dashboard/committees") {
    return (
      pathname === "/dashboard/committees" ||
      pathname.startsWith("/dashboard/committees/")
    );
  }
  const pathOnly = href.split("?")[0];
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}

function DashboardNavInner() {
  const pathname = usePathname();
  const { activeCommitteeId } = useActiveCommittee();

  const baseLinks = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/committees", label: "Committees" },
  ] as const;

  const scopedLinks = activeCommitteeId
    ? ([
        {
          href: `/dashboard/contributions?committee=${encodeURIComponent(activeCommitteeId)}`,
          label: "Contributions",
        },
        {
          href: `/dashboard/expenditures?committee=${encodeURIComponent(activeCommitteeId)}`,
          label: "Expenditures",
        },
        {
          href: `/dashboard/deadlines?committee=${encodeURIComponent(activeCommitteeId)}`,
          label: "Deadlines",
        },
      ] as const)
    : [];

  return (
    <nav className="flex flex-col gap-1">
      {[...baseLinks, ...scopedLinks].map(({ href, label }) => {
        const active = linkActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/80"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function CommitteeSwitcher() {
  const { committees, activeCommitteeId, setActiveCommitteeId } =
    useActiveCommittee();

  const inputClass =
    "w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500";

  return (
    <div className="mb-4">
      <label
        htmlFor="active-committee"
        className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block mb-1.5"
      >
        Active committee
      </label>
      <select
        id="active-committee"
        className={inputClass}
        value={activeCommitteeId ?? ""}
        onChange={(e) =>
          setActiveCommitteeId(e.target.value ? e.target.value : null)
        }
      >
        <option value="">Select…</option>
        {committees.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      {committees.length === 0 ? (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">
          Create a committee to track contributions and deadlines.
        </p>
      ) : null}
    </div>
  );
}

export function DashboardShell({
  email,
  committees,
  children,
}: {
  email: string;
  committees: CommitteeOption[];
  children: React.ReactNode;
}) {
  return (
    <ActiveCommitteeProvider committees={committees}>
      <div className="min-h-screen flex bg-neutral-100 dark:bg-neutral-950">
        <aside className="w-56 shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Utah compliance
            </p>
            <p
              className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mt-1 truncate"
              title={email}
            >
              {email}
            </p>
          </div>
          <div className="p-3 flex-1 flex flex-col min-h-0">
            <CommitteeSwitcher />
            <div className="flex-1 overflow-y-auto">
              <DashboardNavInner />
            </div>
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
    </ActiveCommitteeProvider>
  );
}
