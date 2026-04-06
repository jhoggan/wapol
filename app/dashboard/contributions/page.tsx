import { ContributionsClient } from "@/components/dashboard/contributions-client";
import { SelectCommitteePrompt } from "@/components/dashboard/select-committee-prompt";
import { getCommitteesForSelect } from "@/lib/dashboard/scope";
import { createClient } from "@/lib/supabase/server";

export default async function ContributionsPage({
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

  const { data: rows } = await supabase
    .from("contributions")
    .select(
      "id, donor_full_name, amount, date, payment_method, employer, occupation"
    )
    .eq("committee_id", committee)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const scoped = committees.filter((c) => c.id === committee);
  const label = scoped[0]?.label ?? "this committee";

  return (
    <ContributionsClient
      initialRows={rows ?? []}
      committees={scoped}
      scopedCommitteeLabel={label}
    />
  );
}
