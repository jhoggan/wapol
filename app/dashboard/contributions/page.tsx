import { ContributionsClient } from "@/components/dashboard/contributions-client";
import { SelectCommitteePrompt } from "@/components/dashboard/select-committee-prompt";
import { parseActBlueCredentialsMeta } from "@/lib/dashboard/actblue-credentials-meta";
import { getCommitteesForSelect } from "@/lib/dashboard/scope";
import { createClient } from "@/lib/supabase/server";

export default async function ContributionsPage({
  searchParams,
}: {
  searchParams: Promise<{ committee?: string; source?: string }>;
}) {
  const { committee: committeeParam, source: sourceParam } = await searchParams;
  const committee = committeeParam?.trim() ?? "";
  const sourceRaw = sourceParam?.trim().toLowerCase() ?? "";
  const sourceFilter =
    sourceRaw === "manual" || sourceRaw === "actblue" ? sourceRaw : "all";

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
        title="Contributions"
        description="Select an active committee in the sidebar to view and add contributions for that committee."
      />
    );
  }

  if (!idSet.has(committee)) {
    return (
      <SelectCommitteePrompt
        title="Contributions"
        description="That committee was not found. Choose another committee from the sidebar."
      />
    );
  }

  let contribQuery = supabase
    .from("contributions")
    .select(
      "id, donor_full_name, amount, date, payment_method, employer, occupation, source, is_recurring"
    )
    .eq("committee_id", committee);

  if (sourceFilter === "manual") {
    contribQuery = contribQuery.eq("source", "manual");
  } else if (sourceFilter === "actblue") {
    contribQuery = contribQuery.eq("source", "actblue");
  }

  const { data: rows } = await contribQuery
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const { data: comRow } = await supabase
    .from("committees")
    .select("actblue_last_synced_at, actblue_client_uuid")
    .eq("id", committee)
    .maybeSingle();

  const { data: abMetaRaw } = await supabase.rpc(
    "committee_actblue_credentials_meta",
    { p_committee_id: committee }
  );
  const abMeta = parseActBlueCredentialsMeta(abMetaRaw);

  const actBlueConnected = Boolean(
    comRow?.actblue_client_uuid?.trim() && abMeta.configured
  );

  const scoped = committees.filter((c) => c.id === committee);
  const label = scoped[0]?.label ?? "this committee";

  return (
    <ContributionsClient
      initialRows={rows ?? []}
      committees={scoped}
      scopedCommitteeLabel={label}
      activeCommitteeId={committee}
      sourceFilter={sourceFilter}
      actBlueConnected={actBlueConnected}
      actblueLastSyncedAt={comRow?.actblue_last_synced_at ?? null}
    />
  );
}