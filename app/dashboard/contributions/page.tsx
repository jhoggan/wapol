import { ContributionsClient } from "@/components/dashboard/contributions-client";
import { getCommitteesForSelect } from "@/lib/dashboard/scope";
import { createClient } from "@/lib/supabase/server";

export default async function ContributionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const committees = await getCommitteesForSelect(supabase);

  const { data: rows } = await supabase
    .from("contributions")
    .select(
      "id, donor_full_name, amount, date, payment_method, employer, occupation"
    )
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <ContributionsClient
      initialRows={rows ?? []}
      committees={committees}
    />
  );
}
