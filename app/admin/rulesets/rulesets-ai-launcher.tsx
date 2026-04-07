"use client";

import { useState } from "react";

export function RulesetsAiLauncher() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState("Utah");
  const [jurisdictionType, setJurisdictionType] = useState("lieutenant_governor");
  const [electionYear, setElectionYear] = useState(2026);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ai-agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state,
          jurisdiction_type: jurisdictionType,
          election_year: electionYear,
        }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setMessage(j.error ?? `Error ${res.status}`);
        return;
      }
      setMessage("Task triggered. Check Trigger.dev and change requests.");
      setOpen(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-2 text-sm font-medium text-neutral-800 dark:text-neutral-200"
      >
        Run AI agent
      </button>
      {open ? (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Run AI ruleset agent
            </h3>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">State</span>
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-950 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">
                  Jurisdiction type
                </span>
                <select
                  value={jurisdictionType}
                  onChange={(e) => setJurisdictionType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-950 px-3 py-2 text-sm"
                >
                  <option value="lieutenant_governor">Lieutenant Governor</option>
                  <option value="county">County</option>
                  <option value="municipal">Municipal</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">
                  Election year
                </span>
                <input
                  type="number"
                  value={electionYear}
                  onChange={(e) => setElectionYear(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-950 px-3 py-2 text-sm"
                />
              </label>
            </div>
            {message ? (
              <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={run}
                className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {loading ? "Starting…" : "Run"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
