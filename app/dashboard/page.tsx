import { redirect } from "next/navigation";
import { OverviewCommitteeSync } from "@/components/dashboard/overview-committee-sync";
import { StatCard } from "@/components/dashboard/stat-card";
import { SelectCommitteePrompt } from "@/components/dashboard/select-committee-prompt";
import { parseActBlueCredentialsMeta } from "@/lib/dashboard/actblue-credentials-meta";
import { formatCurrency, formatDate } from "@/lib/format";
import { getDashboardCommittees } from "@/lib/dashboard/scope";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardOverviewPage({
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

  if (!user) return null;

  const committees = await getDashboardCommittees(supabase);

  if (committees.length === 0) {
    redirect("/dashboard/committees/new");
  }

  const idSet = new Set(committees.map((c) => c.id));
  if (!committee || !idSet.has(committee)) {
    return (
      <SelectCommitteePrompt
        title="Overview"
        description="Choose a committee from the picker to view this dashboard."
      />
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date();
  in30.setUTCDate(in30.getUTCDate() + 30);
  const in30Str = in30.toISOString().slice(0, 10);

  const { data: contribAmounts } = await supabase
    .from("contributions")
    .select("amount")
    .eq("committee_id", committee);

  const totalContributions =
    contribAmounts?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;

  const { data: expAmounts } = await supabase
    .from("expenditures")
    .select("amount")
    .eq("committee_id", committee);

  const totalExpenditures =
    expAmounts?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;

  const { count } = await supabase
    .from("filing_deadlines")
    .select("*", { count: "exact", head: true })
    .eq("committee_id", committee)
    .eq("completed", false)
    .gte("due_date", today)
    .lte("due_date", in30Str);

  const upcomingDeadlineCount = count ?? 0;

  const { data: recent } = await supabase
    .from("contributions")
    .select("id, donor_full_name, amount, date, payment_method")
    .eq("committee_id", committee)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  const recentContributions = recent ?? [];

  const { data: deadlines } = await supabase
    .from("filing_deadlines")
    .select(
      "id, deadline_name, due_date, filing_period_start, filing_period_end"
    )
    .eq("committee_id", committee)
    .eq("completed", false)
    .order("due_date", { ascending: true })
    .limit(10);

  const upcomingDeadlines = deadlines ?? [];

  const cashOnHand = totalContributions - totalExpenditures;

  const activeLabel =
    committees.find((c) => c.id === committee)?.committeeName ?? "this committee";

  const { data: committeeRow } = await supabase
    .from("committees")
    .select("actblue_client_uuid, actblue_last_synced_at")
    .eq("id", committee)
    .maybeSingle();

  const { data: abMetaRaw } = await supabase.rpc(
    "committee_actblue_credentials_meta",
    { p_committee_id: committee }
  );
  const abMeta = parseActBlueCredentialsMeta(abMetaRaw);

  const actBlueSyncEnabled =
    Boolean(committeeRow?.actblue_client_uuid?.trim()) && abMeta.configured;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Overview
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            <span className="font-medium text-neutral-800 dark:text-neutral-200">
              {activeLabel}
            </span>
            <span className="text-neutral-500 dark:text-neutral-400">
              {" "}
              — financial summary and upcoming activity.
            </span>
          </p>
        </div>
        <div className="shrink-0">
          <OverviewCommitteeSync
            committeeId={committee}
            syncEnabled={actBlueSyncEnabled}
            actblueLastSyncedAt={committeeRow?.actblue_last_synced_at ?? null}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total contributions"
          value={formatCurrency(totalContributions)}
        />
        <StatCard
          title="Total expenditures"
          value={formatCurrency(totalExpenditures)}
        />
        <StatCard
          title="Cash on hand"
          value={formatCurrency(cashOnHand)}
          subtitle="Contributions minus expenditures"
        />
        <StatCard
          title="Upcoming deadlines"
          value={String(upcomingDeadlineCount)}
          subtitle="Due within 30 days, not completed"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Recent contributions
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Five most recent by contribution date
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-neutral-500 dark:text-neutral-400">
                  <th className="px-4 py-2 font-medium">Donor</th>
                  <th className="px-4 py-2 font-medium">Amount</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Method</th>
                </tr>
              </thead>
              <tbody>
                {recentContributions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-neutral-500"
                    >
                      No contributions yet.
                    </td>
                  </tr>
                ) : (
                  recentContributions.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-neutral-100 dark:border-neutral-800/80"
                    >
                      <td className="px-4 py-2.5 text-neutral-900 dark:text-neutral-100">
                        {row.donor_full_name}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300">
                        {row.payment_method}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Upcoming deadlines
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Incomplete, earliest due first
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-neutral-500 dark:text-neutral-400">
                  <th className="px-4 py-2 font-medium">Deadline</th>
                  <th className="px-4 py-2 font-medium">Due</th>
                  <th className="px-4 py-2 font-medium">Period</th>
                </tr>
              </thead>
              <tbody>
                {upcomingDeadlines.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-neutral-500"
                    >
                      No open deadlines.
                    </td>
                  </tr>
                ) : (
                  upcomingDeadlines.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-neutral-100 dark:border-neutral-800/80"
                    >
                      <td className="px-4 py-2.5 text-neutral-900 dark:text-neutral-100">
                        {row.deadline_name}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300">
                        {formatDate(row.due_date)}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                        {formatDate(row.filing_period_start)} –{" "}
                        {formatDate(row.filing_period_end)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
