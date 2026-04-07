"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";

export type DeadlineRow = {
  id: string;
  deadline_name: string;
  filing_period_start: string;
  filing_period_end: string;
  due_date: string;
  completed: boolean;
  disqualification_risk?: boolean;
  grace_period_hours?: number | null;
  fine_amount?: number | null;
  deadline_time?: string | null;
};

type Props = {
  initialRows: DeadlineRow[];
  todayIso: string;
  scopedCommitteeLabel?: string;
  rulesetLabel?: string | null;
  contributionAlertCount?: number;
};

export function DeadlinesClient({
  initialRows,
  todayIso,
  scopedCommitteeLabel,
  rulesetLabel,
  contributionAlertCount = 0,
}: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rows, setRows] = useState(initialRows);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  async function toggleCompleted(row: DeadlineRow) {
    const next = !row.completed;
    setPendingId(row.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("filing_deadlines")
      .update({ completed: next })
      .eq("id", row.id);
    setPendingId(null);
    if (error) {
      alert(error.message);
      return;
    }
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, completed: next } : r))
    );
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Filing deadlines
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          {scopedCommitteeLabel
            ? `Deadlines for ${scopedCommitteeLabel}. Sorted by due date.`
            : "Sorted by due date. Overdue and incomplete rows are highlighted."}
        </p>
        {rulesetLabel ? (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
            Active ruleset: {rulesetLabel}
          </p>
        ) : null}
      </div>

      {contributionAlertCount > 0 ? (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          {contributionAlertCount} contribution
          {contributionAlertCount === 1 ? "" : "s"} approaching the 31-day reporting
          window. Review the Contributions page and notifications.
        </div>
      ) : null}

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-neutral-500 dark:text-neutral-400">
                <th className="px-4 py-3 font-medium">Deadline</th>
                <th className="px-4 py-3 font-medium">Period start</th>
                <th className="px-4 py-3 font-medium">Period end</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Flags</th>
                <th className="px-4 py-3 font-medium">Completed</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-neutral-500"
                  >
                    No deadlines yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const overdue = !row.completed && row.due_date < todayIso;
                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-neutral-100 dark:border-neutral-800/80 ${
                        overdue ? "bg-red-50 dark:bg-red-950/30" : ""
                      }`}
                    >
                      <td
                        className={`px-4 py-2.5 font-medium ${
                          overdue
                            ? "text-red-900 dark:text-red-200"
                            : "text-neutral-900 dark:text-neutral-100"
                        }`}
                      >
                        {row.deadline_name}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                        {formatDate(row.filing_period_start)}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                        {formatDate(row.filing_period_end)}
                      </td>
                      <td
                        className={`px-4 py-2.5 whitespace-nowrap ${
                          overdue
                            ? "text-red-800 dark:text-red-300 font-medium"
                            : "text-neutral-600 dark:text-neutral-300"
                        }`}
                      >
                        {formatDate(row.due_date)}
                        {row.deadline_time && row.deadline_time !== "23:59" ? (
                          <span className="block text-xs text-neutral-500">
                            {row.deadline_time}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
                        {row.disqualification_risk ||
                        row.grace_period_hours != null ||
                        row.fine_amount != null ? (
                          <>
                            {row.disqualification_risk ? (
                              <span className="inline-flex rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200 px-2 py-0.5 font-medium">
                                Disqualification risk
                              </span>
                            ) : null}
                            {row.grace_period_hours != null ? (
                              <span className="block">
                                Grace: {row.grace_period_hours}h
                              </span>
                            ) : null}
                            {row.fine_amount != null ? (
                              <span className="block">
                                Fine: ${Number(row.fine_amount).toFixed(2)}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={row.completed}
                            disabled={pendingId === row.id}
                            onChange={() => toggleCompleted(row)}
                            className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
                          />
                          <span className="text-neutral-600 dark:text-neutral-400">
                            {pendingId === row.id
                              ? "…"
                              : row.completed
                                ? "Yes"
                                : "No"}
                          </span>
                        </label>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
