import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AdminChangeRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: raw } = await searchParams;
  const tab = raw === "approved" || raw === "rejected" ? raw : "pending";

  const supabase = await createClient();
  let q = supabase
    .from("ruleset_change_requests")
    .select(
      "id, change_type, source, status, source_description, created_at, ruleset_id"
    )
    .order("created_at", { ascending: false });

  if (tab === "pending") q = q.eq("status", "pending");
  else if (tab === "approved") q = q.eq("status", "approved");
  else q = q.eq("status", "rejected");

  const { data: rows } = await q;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        Ruleset change requests
      </h1>
      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        {(
          [
            ["pending", "Pending"],
            ["approved", "Approved"],
            ["rejected", "Rejected"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/change-requests?status=${key}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === key
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-neutral-500 dark:text-neutral-400">
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Ruleset</th>
              <th className="px-4 py-2 font-medium">Source</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Summary</th>
              <th className="px-4 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                  No requests
                </td>
              </tr>
            ) : (
              (rows ?? []).map((r) => {
                return (
                  <tr
                    key={r.id as string}
                    className="border-b border-neutral-100 dark:border-neutral-800/80"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/change-requests/${r.id}`}
                        className="font-medium text-neutral-900 dark:text-neutral-100 hover:underline"
                      >
                        {r.change_type as string}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-neutral-600 dark:text-neutral-300 font-mono text-xs">
                      {(r.ruleset_id as string | null)?.slice(0, 8) ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs font-medium rounded px-2 py-0.5 ${
                          r.source === "ai_agent"
                            ? "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200"
                            : "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"
                        }`}
                      >
                        {r.source === "ai_agent" ? "AI" : "Manual"}
                      </span>
                    </td>
                    <td className="px-4 py-2">{r.status as string}</td>
                    <td className="px-4 py-2 text-neutral-600 dark:text-neutral-300 max-w-xs truncate">
                      {(r.source_description as string | null) ?? "—"}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-neutral-500">
                      {new Date(r.created_at as string).toLocaleString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
