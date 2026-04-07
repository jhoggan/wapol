"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500";

const labelClass = "text-sm font-medium block mb-1";

type Props = {
  committeeId: string;
  committeeName: string;
  initialClientUuid: string | null;
  hasSavedSecret: boolean;
  secretLast4: string | null;
  lastSyncedAt: string | null;
};

export function ActBlueSettingsSection({
  committeeId,
  committeeName,
  initialClientUuid,
  hasSavedSecret,
  secretLast4,
  lastSyncedAt,
}: Props) {
  const router = useRouter();
  const [clientUuid, setClientUuid] = useState(initialClientUuid ?? "");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [localHasSecret, setLocalHasSecret] = useState(hasSavedSecret);
  const [localLast4, setLocalLast4] = useState(secretLast4);
  async function saveCredentials(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setSaving(true);
    const supabase = createClient();

    const uuidTrim = clientUuid.trim();
    const secretTrim = clientSecret.trim();

    if (!uuidTrim) {
      setErr("ActBlue Client UUID is required.");
      setSaving(false);
      return;
    }

    const patch: Record<string, string | null> = {
      actblue_client_uuid: uuidTrim,
    };

    if (secretTrim) {
      patch.actblue_client_secret = secretTrim;
    } else if (!localHasSecret) {
      setErr("ActBlue Client Secret is required on first save.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("committees")
      .update(patch)
      .eq("id", committeeId);

    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }

    setClientSecret("");
    setLocalHasSecret(true);
    if (secretTrim.length >= 4) {
      setLocalLast4(secretTrim.slice(-4));
    }
    setMsg("ActBlue credentials saved.");
    router.refresh();
  }

  async function syncNow() {
    setMsg(null);
    setErr(null);
    setSyncing(true);
    try {
      const res = await fetch("/api/actblue/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ committee_id: committeeId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setErr(data.error ?? `Request failed (${res.status})`);
        setSyncing(false);
        return;
      }
      setMsg("Sync started. Refresh this page in a few minutes to see updated results.");
    } catch {
      setErr("Could not start sync.");
    }
    setSyncing(false);
  }

  const q = `committee=${encodeURIComponent(committeeId)}`;

  return (
    <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        ActBlue Integration
      </h2>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        Committee:{" "}
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          {committeeName}
        </span>
      </p>

      {lastSyncedAt ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Last synced:{" "}
          <span className="font-medium">
            {new Date(lastSyncedAt).toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        </p>
      ) : null}

      <form onSubmit={saveCredentials} className="space-y-4 max-w-lg">
        <div>
          <label htmlFor="ab-uuid" className={labelClass}>
            ActBlue Client UUID
          </label>
          <input
            id="ab-uuid"
            value={clientUuid}
            onChange={(e) => setClientUuid(e.target.value)}
            autoComplete="off"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="ab-secret" className={labelClass}>
            ActBlue Client Secret
          </label>
          <input
            id="ab-secret"
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            autoComplete="new-password"
            placeholder={
              localHasSecret
                ? localLast4
                  ? `Leave blank to keep saved secret (ends with …${localLast4})`
                  : "Leave blank to keep saved secret"
                : "Required"
            }
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save ActBlue credentials"}
        </button>
      </form>

      <div className="flex flex-wrap gap-3 items-center">
        <button
          type="button"
          onClick={syncNow}
          disabled={syncing || !localHasSecret || !clientUuid.trim()}
          className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {syncing ? "Starting…" : "Sync now"}
        </button>
        <Link
          href={`/dashboard/settings/actblue-logs?${q}`}
          className="text-sm font-medium text-neutral-700 dark:text-neutral-300 underline-offset-2 hover:underline"
        >
          View sync history
        </Link>
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xl leading-relaxed">
        You can generate ActBlue API credentials from your ActBlue dashboard under
        Admin → API Credentials. Your client secret is stored securely and is never
        displayed in full after saving.
      </p>

      {msg ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{msg}</p>
      ) : null}
      {err ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {err}
        </p>
      ) : null}
    </section>
  );
}
