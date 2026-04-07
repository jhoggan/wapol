"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { signOut } from "@/app/dashboard/actions";
import type { DashboardCommittee } from "@/lib/dashboard/scope";
import {
  ActiveCommitteeProvider,
  useActiveCommittee,
} from "./active-committee-context";

function committeeExemptPath(pathname: string) {
  return (
    pathname.startsWith("/dashboard/committees/new") ||
    pathname.startsWith("/dashboard/committees/not-available")
  );
}

function CommitteeUrlSyncInner() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeCommitteeId, setActiveCommitteeId, committees, hasHydrated } =
    useActiveCommittee();

  useEffect(() => {
    if (!hasHydrated) return;
    const q = searchParams.get("committee")?.trim() ?? "";
    if (
      q &&
      committees.some((c) => c.id === q) &&
      q !== activeCommitteeId
    ) {
      setActiveCommitteeId(q);
    }
  }, [
    hasHydrated,
    searchParams,
    committees,
    activeCommitteeId,
    setActiveCommitteeId,
  ]);

  useEffect(() => {
    if (!hasHydrated || !activeCommitteeId) return;
    if (committeeExemptPath(pathname)) return;
    const q = searchParams.get("committee")?.trim();
    if (q === activeCommitteeId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("committee", activeCommitteeId);
    router.replace(`${pathname}?${params.toString()}`);
  }, [
    hasHydrated,
    activeCommitteeId,
    pathname,
    router,
    searchParams,
  ]);

  return null;
}

function CommitteeUrlSync() {
  return (
    <Suspense fallback={null}>
      <CommitteeUrlSyncInner />
    </Suspense>
  );
}

function linkActive(pathname: string, href: string) {
  if (href.startsWith("/dashboard?")) return pathname === "/dashboard";
  const pathOnly = href.split("?")[0];
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}

function isComplianceChildPath(pathname: string) {
  return (
    pathname === "/dashboard/contributions" ||
    pathname === "/dashboard/expenditures" ||
    pathname === "/dashboard/deadlines"
  );
}

const linkBase =
  "block rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left w-full";
const linkInactive =
  "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/80";
const linkActiveCls =
  "bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100";

function DashboardNavInner() {
  const pathname = usePathname();
  const { activeCommitteeId } = useActiveCommittee();
  const [complianceOpen, setComplianceOpen] = useState(() =>
    isComplianceChildPath(pathname)
  );
  const prevPathname = useRef(pathname);

  useEffect(() => {
    const prev = prevPathname.current;
    prevPathname.current = pathname;
    const nowC = isComplianceChildPath(pathname);
    const prevC = isComplianceChildPath(prev);
    if (nowC && !prevC) {
      setComplianceOpen(true);
    }
    if (!nowC && prevC) {
      setComplianceOpen(false);
    }
  }, [pathname]);

  if (!activeCommitteeId) {
    return null;
  }

  const q = `committee=${encodeURIComponent(activeCommitteeId)}`;
  const overviewHref = `/dashboard?${q}`;
  const complianceSub = [
    { href: `/dashboard/contributions?${q}`, label: "Contributions" },
    { href: `/dashboard/expenditures?${q}`, label: "Expenditures" },
    { href: `/dashboard/deadlines?${q}`, label: "Deadlines" },
  ] as const;

  const complianceSectionActive = complianceSub.some((s) =>
    linkActive(pathname, s.href)
  );

  return (
    <nav className="flex flex-col gap-1">
      <Link
        href={overviewHref}
        className={`${linkBase} ${
          linkActive(pathname, overviewHref) ? linkActiveCls : linkInactive
        }`}
      >
        Overview
      </Link>

      <div>
        <button
          type="button"
          onClick={() => setComplianceOpen((o) => !o)}
          aria-expanded={complianceOpen}
          className={`${linkBase} flex items-center justify-between gap-2 ${
            complianceSectionActive ? linkActiveCls : linkInactive
          }`}
        >
          <span>Compliance</span>
          <svg
            className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform ${
              complianceOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {complianceOpen ? (
          <div className="mt-1 ml-2 flex flex-col gap-0.5 border-l border-neutral-200 pl-2 dark:border-neutral-700">
            {complianceSub.map(({ href, label }) => {
              const active = linkActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`${linkBase} pl-2 ${active ? linkActiveCls : linkInactive}`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </nav>
  );
}

function CommitteePickerModal({
  open,
  committees,
  onSelect,
}: {
  open: boolean;
  committees: DashboardCommittee[];
  onSelect: (id: string) => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-neutral-100 dark:bg-neutral-950"
      role="dialog"
      aria-modal="true"
      aria-labelledby="committee-picker-title"
    >
      <div className="flex-1 overflow-y-auto px-4 py-10 sm:py-14">
        <div className="max-w-3xl mx-auto">
          <h1
            id="committee-picker-title"
            className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 text-center"
          >
            Choose a committee
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center mt-2 max-w-lg mx-auto">
            Select which committee you&apos;re working with. You can switch
            anytime from the sidebar.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {committees.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                className="text-left rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-sm hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {c.typeLabel}
                </p>
                <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mt-1">
                  {c.committeeName}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    {c.entityType === "candidate" ? "Candidate" : "Group"}:{" "}
                  </span>
                  {c.entityName}
                </p>
              </button>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center gap-2">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Need another committee?
            </p>
            <Link
              href="/dashboard/committees/new"
              className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
            >
              Create new committee
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardShellInner({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    committees,
    activeCommitteeId,
    setActiveCommitteeId,
    hasHydrated,
  } = useActiveCommittee();

  const [switching, setSwitching] = useState(false);

  const exempt = committeeExemptPath(pathname);
  const needsPick =
    hasHydrated &&
    committees.length > 0 &&
    !activeCommitteeId &&
    !exempt;
  const showPicker = needsPick || switching;

  const activeMeta = committees.find((c) => c.id === activeCommitteeId);

  function handleSelectCommittee(id: string) {
    setActiveCommitteeId(id);
    setSwitching(false);
    if (!committeeExemptPath(pathname)) {
      const params = new URLSearchParams();
      params.set("committee", id);
      router.replace(`${pathname}?${params.toString()}`);
    }
  }

  return (
    <>
      <CommitteeUrlSync />
      <CommitteePickerModal
        open={showPicker}
        committees={committees}
        onSelect={handleSelectCommittee}
      />
      <div className="min-h-screen flex bg-neutral-100 dark:bg-neutral-950">
        <aside className="w-56 shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Wasatch Political
            </p>
            <p
              className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mt-1 truncate"
              title={email}
            >
              {email}
            </p>
            {committees.length > 0 && activeMeta ? (
              <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Active committee
                </p>
                <p
                  className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mt-1 leading-snug"
                  title={activeMeta.committeeName}
                >
                  {activeMeta.committeeName}
                </p>
                <button
                  type="button"
                  onClick={() => setSwitching(true)}
                  className="mt-2 w-full rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  Switch committee
                </button>
              </div>
            ) : committees.length > 0 && hasHydrated && !activeCommitteeId ? (
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-3">
                Select a committee to continue.
              </p>
            ) : null}
          </div>
          <div className="p-3 flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto">
              <DashboardNavInner />
            </div>
          </div>
          <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
            {activeCommitteeId ? (
              <Link
                href={`/dashboard/settings?committee=${encodeURIComponent(activeCommitteeId)}`}
                className="block w-full rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/80 text-left"
              >
                Settings
              </Link>
            ) : (
              <span className="block w-full rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 dark:text-neutral-500 text-left cursor-not-allowed">
                Settings
              </span>
            )}
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
          <div
            className={`max-w-6xl mx-auto px-6 py-8 ${showPicker ? "pointer-events-none opacity-0" : ""}`}
          >
            {children}
          </div>
        </main>
      </div>
    </>
  );
}

export function DashboardShell({
  email,
  committees,
  children,
}: {
  email: string;
  committees: DashboardCommittee[];
  children: React.ReactNode;
}) {
  return (
    <ActiveCommitteeProvider committees={committees}>
      <DashboardShellInner email={email}>{children}</DashboardShellInner>
    </ActiveCommitteeProvider>
  );
}
