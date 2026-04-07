"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RulesetActions({
  rulesetId,
  status,
}: {
  rulesetId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function activate() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/rulesets/${rulesetId}/activate`, {
        method: "POST",
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErr(j.error ?? "Activate failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/rulesets/${rulesetId}/archive`, {
        method: "POST",
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErr(j.error ?? "Archive failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {err ? (
        <p className="text-sm text-red-600 dark:text-red-400">{err}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {status === "draft" ? (
          <button
            type="button"
            disabled={busy}
            onClick={activate}
            className="rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Activate
          </button>
        ) : null}
        {status === "active" ? (
          <button
            type="button"
            disabled={busy}
            onClick={archive}
            className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Archive
          </button>
        ) : null}
      </div>
    </div>
  );
}
