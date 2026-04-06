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
};

type Props = {
  initialRows: DeadlineRow[];
  todayIso: string;
};

export function DeadlinesClient({ initialRows, todayIso }: Props) {
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
          Sorted by due date. Overdue and incomplete rows are highlighted.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-neutral-500 dark:text-neutral-400">
                <th className="px-4 py-3 font-medium">Deadline</th>
                <th className="px-4 py-3 font-medium">Period start</th>
                <th className="px-4 py-3 font-medium">Period end</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Completed</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
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
