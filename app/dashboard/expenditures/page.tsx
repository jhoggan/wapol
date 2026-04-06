import { ExpendituresClient } from "@/components/dashboard/expenditures-client";
import { getCommitteesForSelect } from "@/lib/dashboard/scope";
import { createClient } from "@/lib/supabase/server";

export default async function ExpendituresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const committees = await getCommitteesForSelect(supabase);

  const { data: rows } = await supabase
    .from("expenditures")
    .select("id, payee_name, amount, date, purpose")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <ExpendituresClient initialRows={rows ?? []} committees={committees} />
  );
}
