import { DeadlinesClient } from "@/components/dashboard/deadlines-client";
import { createClient } from "@/lib/supabase/server";

export default async function DeadlinesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const todayIso = new Date().toISOString().slice(0, 10);

  const { data: rows } = await supabase
    .from("filing_deadlines")
    .select(
      "id, deadline_name, filing_period_start, filing_period_end, due_date, completed"
    )
    .order("due_date", { ascending: true });

  return (
    <DeadlinesClient initialRows={rows ?? []} todayIso={todayIso} />
  );
}
