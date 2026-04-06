import { ExpendituresClient } from "@/components/dashboard/expenditures-client";
import { SelectCommitteePrompt } from "@/components/dashboard/select-committee-prompt";
import { getCommitteesForSelect } from "@/lib/dashboard/scope";
import { createClient } from "@/lib/supabase/server";

export default async function ExpendituresPage({
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
        title="Expenditures"
        description="Select an active committee in the sidebar to view and add expenditures for that committee."
      />
    );
  }

  if (!idSet.has(committee)) {
    return (
      <SelectCommitteePrompt
        title="Expenditures"
        description="That committee was not found. Choose another committee from the sidebar."
      />
    );
  }

  const { data: rows } = await supabase
    .from("expenditures")
    .select("id, payee_name, amount, date, purpose")
    .eq("committee_id", committee)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const scoped = committees.filter((c) => c.id === committee);
  const label = scoped[0]?.label ?? "this committee";

  return (
    <ExpendituresClient
      initialRows={rows ?? []}
      committees={scoped}
      scopedCommitteeLabel={label}
    />
  );
}
