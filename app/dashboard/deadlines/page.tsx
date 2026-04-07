import { DeadlinesClient } from "@/components/dashboard/deadlines-client";
import { SelectCommitteePrompt } from "@/components/dashboard/select-committee-prompt";
import { getCommitteesForSelect } from "@/lib/dashboard/scope";
import { createClient } from "@/lib/supabase/server";

export default async function DeadlinesPage({
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

  const committees = await getCommitteesForSelect(supabase);
  const idSet = new Set(committees.map((c) => c.id));

  if (!committee) {
    return (
      <SelectCommitteePrompt
        title="Filing deadlines"
        description="Select an active committee in the sidebar to view deadlines for that committee."
      />
    );
  }

  if (!idSet.has(committee)) {
    return (
      <SelectCommitteePrompt
        title="Filing deadlines"
        description="That committee was not found. Choose another committee from the sidebar."
      />
    );
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  const { data: rows } = await supabase
    .from("filing_deadlines")
    .select(
      "id, deadline_name, filing_period_start, filing_period_end, due_date, completed, disqualification_risk, grace_period_hours, fine_amount, deadline_time"
    )
    .eq("committee_id", committee)
    .order("due_date", { ascending: true });

  const { data: comMeta } = await supabase
    .from("committees")
    .select("ruleset_id, jurisdiction_rulesets(name, version)")
    .eq("id", committee)
    .maybeSingle();

  const rs = comMeta?.jurisdiction_rulesets as
    | { name?: string; version?: number }
    | null
    | undefined;
  const rulesetLabel =
    rs?.name != null && rs?.version != null
      ? `${rs.name} (v${rs.version})`
      : null;

  const { count: alertCount } = await supabase
    .from("contribution_alerts")
    .select("id", { count: "exact", head: true })
    .eq("committee_id", committee)
    .eq("resolved", false);

  const scoped = committees.filter((c) => c.id === committee);
  const label = scoped[0]?.label ?? "this committee";

  return (
    <DeadlinesClient
      initialRows={rows ?? []}
      todayIso={todayIso}
      scopedCommitteeLabel={label}
      rulesetLabel={rulesetLabel}
      contributionAlertCount={alertCount ?? 0}
    />
  );
}
