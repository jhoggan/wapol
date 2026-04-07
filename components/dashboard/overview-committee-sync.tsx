"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  committeeId: string;
  /** True when ActBlue secret is configured (RPC); UUID is assumed set by parent. */
  syncEnabled: boolean;
  actblueLastSyncedAt: string | null;
};

export function OverviewCommitteeSync({
  committeeId,
  syncEnabled,
  actblueLastSyncedAt,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, []);

  async function onSync() {
    if (!syncEnabled || loading) return;
    setError(false);
    setSuccess(false);
    setLoading(true);
    try {
      const res = await fetch("/api/sync/committee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ committee_id: committeeId }),
      });
      if (!res.ok) {
        setError(true);
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { triggered?: boolean };
      if (data.triggered) {
        setSuccess(true);
        if (fadeTimer.current) clearTimeout(fadeTimer.current);
        fadeTimer.current = setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
    setLoading(false);
  }

  const lastSyncedLabel =
    actblueLastSyncedAt != null
      ? new Date(actblueLastSyncedAt).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;

  const disabled = !syncEnabled || loading;

  return (
    <div className="flex flex-col items-end gap-1.5 text-right">
      <div className="relative inline-flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={onSync}
          disabled={disabled}
          title={
            !syncEnabled
              ? "Connect ActBlue in Settings to enable sync"
              : undefined
          }
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors ${
            syncEnabled
              ? "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
              : "cursor-not-allowed bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500"
          } disabled:opacity-70`}
        >
          {loading ? (
            <>
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-neutral-900/30 dark:border-t-neutral-900"
                aria-hidden
              />
              Syncing…
            </>
          ) : (
            "Sync now"
          )}
        </button>
        {success ? (
          <p
            className="flex items-center justify-end gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400"
            role="status"
          >
            <svg
              className="h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            Sync started
          </p>
        ) : null}
        {error ? (
          <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
            Sync failed — try again
          </p>
        ) : null}
      </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-[16rem]">
        {lastSyncedLabel ? (
          <>
            Last synced: <span className="text-neutral-700 dark:text-neutral-300">{lastSyncedLabel}</span>
          </>
        ) : (
          "Never synced"
        )}
      </p>
    </div>
  );
}
