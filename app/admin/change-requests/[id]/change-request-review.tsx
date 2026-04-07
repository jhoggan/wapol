"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ChangeRequestReview({ id }: { id: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(action: "approve" | "reject") {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/change-requests/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, review_notes: notes.trim() || undefined }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErr(j.error ?? "Request failed");
        return;
      }
      router.push("/admin/change-requests");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
      <label className="block text-sm">
        <span className="text-neutral-600 dark:text-neutral-400">Review notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-950 px-3 py-2 text-sm"
        />
      </label>
      {err ? (
        <p className="text-sm text-red-600 dark:text-red-400">{err}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => submit("approve")}
          className="rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit("reject")}
          className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="text-xs overflow-auto max-h-[480px] rounded-lg bg-neutral-100 dark:bg-neutral-950 p-4 text-neutral-800 dark:text-neutral-200">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function ProposedChangesView({ value }: { value: unknown }) {
  return <JsonBlock value={value} />;
}
