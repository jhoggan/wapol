import Link from "next/link";
import { SelectCommitteePrompt } from "@/components/dashboard/select-committee-prompt";
import { getDashboardCommittees } from "@/lib/dashboard/scope";
import { createClient } from "@/lib/supabase/server";

function statusBadge(status: string) {
  const base =
    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold";
  if (status === "complete") {
    return (
      <span
        className={`${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200`}
      >
        Complete
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span
        className={`${base} bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200`}
      >
        Failed
      </span>
    );
  }
  return (
    <span
      className={`${base} bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200`}
    >
      In progress
    </span>
  );
}

export default async function ActBlueLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ committee?: string }>;
}) {
  const { committee: committeeParam } = await searchParams;
  const committee = committeeParam?.trim() ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const committees = await getDashboardCommittees(supabase);
  const idSet = new Set(committees.map((c) => c.id));

  if (committees.length > 0 && (!committee || !idSet.has(committee))) {
    return (
      <SelectCommitteePrompt
        title="ActBlue sync history"
        description="Choose a committee from the picker to view sync logs."
      />
    );
  }

  const meta = committees.find((c) => c.id === committee);
  const committeeName = meta?.committeeName ?? "Committee";

  const { data: logs } = await supabase
    .from("actblue_sync_logs")
    .select(
      "id, started_at, completed_at, status, contributions_imported, contributions_skipped, error_message, date_range_start, date_range_end"
    )
    .eq("committee_id", committee)
    .order("started_at", { ascending: false });

  const q = `committee=${encodeURIComponent(committee)}`;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/settings?${q}`}
          className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          ← Back to settings
        </Link>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mt-4">
          ActBlue sync history
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          {committeeName}
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-neutral-500 dark:text-neutral-400">
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Completed</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Imported</th>
                <th className="px-4 py-3 font-medium">Skipped</th>
                <th className="px-4 py-3 font-medium">Date range</th>
                <th className="px-4 py-3 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-neutral-500"
                  >
                    No sync runs yet.
                  </td>
                </tr>
              ) : (
                (logs ?? []).map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-neutral-100 dark:border-neutral-800/80"
                  >
                    <td className="px-4 py-2.5 text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                      {row.started_at
                        ? new Date(row.started_at).toLocaleString("en-US", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                      {row.completed_at
                        ? new Date(row.completed_at).toLocaleString("en-US", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {statusBadge(row.status)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-neutral-700 dark:text-neutral-300">
                      {row.contributions_imported ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-neutral-700 dark:text-neutral-300">
                      {row.contributions_skipped ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                      {row.date_range_start} → {row.date_range_end}
                    </td>
                    <td className="px-4 py-2.5 text-red-700 dark:text-red-300 max-w-xs truncate" title={row.error_message ?? undefined}>
                      {row.status === "failed" && row.error_message
                        ? row.error_message
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
