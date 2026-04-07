import { createClient } from "@/lib/supabase/server";
import { ConventionDatesTable, type ConventionRow } from "./convention-dates-table";

export default async function AdminConventionDatesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("convention_dates")
    .select("*")
    .order("election_year", { ascending: false })
    .order("party", { ascending: true });

  const rows = (data ?? []) as ConventionRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Convention dates
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Click a date to edit inline. Add rows via Supabase or a future form.
        </p>
      </div>
      <ConventionDatesTable rows={rows} />
    </div>
  );
}
