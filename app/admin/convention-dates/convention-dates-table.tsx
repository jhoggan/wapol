"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type ConventionRow = {
  id: string;
  party: string;
  state: string;
  election_year: number;
  convention_date: string;
  jurisdiction: string;
  notes: string | null;
};

export function ConventionDatesTable({ rows }: { rows: ConventionRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [dateVal, setDateVal] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/convention-dates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ convention_date: dateVal }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        alert(j.error ?? "Save failed");
        return;
      }
      setEditing(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-neutral-500 dark:text-neutral-400">
            <th className="px-4 py-2 font-medium">Party</th>
            <th className="px-4 py-2 font-medium">State</th>
            <th className="px-4 py-2 font-medium">Year</th>
            <th className="px-4 py-2 font-medium">Jurisdiction</th>
            <th className="px-4 py-2 font-medium">Date</th>
            <th className="px-4 py-2 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="border-b border-neutral-100 dark:border-neutral-800/80"
            >
              <td className="px-4 py-2">{r.party}</td>
              <td className="px-4 py-2">{r.state}</td>
              <td className="px-4 py-2">{r.election_year}</td>
              <td className="px-4 py-2">{r.jurisdiction}</td>
              <td className="px-4 py-2">
                {editing === r.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={dateVal}
                      onChange={(e) => setDateVal(e.target.value)}
                      className="rounded border border-neutral-300 dark:border-neutral-600 px-2 py-1 text-sm bg-white dark:bg-neutral-950"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => save(r.id)}
                      className="text-xs font-medium text-emerald-700 dark:text-emerald-400"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="text-xs text-neutral-500"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(r.id);
                      setDateVal(r.convention_date);
                    }}
                    className="text-left hover:underline text-neutral-900 dark:text-neutral-100"
                  >
                    {r.convention_date}
                  </button>
                )}
              </td>
              <td className="px-4 py-2 text-neutral-600 dark:text-neutral-300 max-w-xs truncate">
                {r.notes ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
