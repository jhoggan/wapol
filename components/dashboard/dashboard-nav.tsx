"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/committees", label: "Committees" },
  { href: "/dashboard/contributions", label: "Contributions" },
  { href: "/dashboard/expenditures", label: "Expenditures" },
  { href: "/dashboard/deadlines", label: "Deadlines" },
] as const;

function linkActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/dashboard/committees") {
    return (
      pathname === "/dashboard/committees" ||
      pathname.startsWith("/dashboard/committees/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {links.map(({ href, label }) => {
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
