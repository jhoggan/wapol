import { jurisdictionTypeLabel } from "@/lib/campaign-labels";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { RulesetsAiLauncher } from "./rulesets-ai-launcher";

export default async function AdminRulesetsPage() {
  const supabase = await createClient();
  const { data: rulesets } = await supabase
    .from("jurisdiction_rulesets")
    .select(
      "id, name, state, jurisdiction_type, jurisdiction_name, election_year, status, version, ai_generated, created_at"
    )
    .order("state", { ascending: true })
    .order("election_year", { ascending: false });

  const ids = (rulesets ?? []).map((r) => r.id);
  let tmpl: { ruleset_id: string }[] = [];
  if (ids.length) {
    const { data } = await supabase
      .from("deadline_templates")
      .select("ruleset_id")
      .in("ruleset_id", ids);
    tmpl = (data ?? []) as { ruleset_id: string }[];
  }

  const countByRuleset = new Map<string, number>();
  for (const t of tmpl ?? []) {
    const id = t.ruleset_id as string;
    countByRuleset.set(id, (countByRuleset.get(id) ?? 0) + 1);
  }

  const byState = new Map<string, typeof rulesets>();
  for (const r of rulesets ?? []) {
    const s = r.state as string;
    const list = byState.get(s) ?? [];
    list.push(r);
    byState.set(s, list);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Jurisdiction rulesets
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Candidate scope — one active ruleset per jurisdiction and election year.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RulesetsAiLauncher />
          <Link
            href="/admin/rulesets/new"
            className="inline-flex items-center justify-center rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2 text-sm font-medium"
          >
            New ruleset
          </Link>
        </div>
      </div>

      {[...byState.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([state, stateRows]) => (
          <section key={state} className="space-y-3">
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              {state}
            </h2>
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-neutral-500 dark:text-neutral-400">
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Jurisdiction</th>
                    <th className="px-4 py-2 font-medium">Year</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Ver.</th>
                    <th className="px-4 py-2 font-medium">AI</th>
                    <th className="px-4 py-2 font-medium">Templates</th>
                  </tr>
                </thead>
                <tbody>
                  {(stateRows ?? []).map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-neutral-100 dark:border-neutral-800/80"
                    >
                      <td className="px-4 py-2">
                        <Link
                          href={`/admin/rulesets/${r.id}`}
                          className="font-medium text-neutral-900 dark:text-neutral-100 hover:underline"
                        >
                          {r.name as string}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-neutral-600 dark:text-neutral-300">
                        {jurisdictionTypeLabel(r.jurisdiction_type as string)}
                        {(r.jurisdiction_name as string | null)
                          ? ` — ${r.jurisdiction_name}`
                          : ""}
                      </td>
                      <td className="px-4 py-2">{r.election_year as number}</td>
                      <td className="px-4 py-2">
                        <StatusBadge status={r.status as string} />
                      </td>
                      <td className="px-4 py-2">{r.version as number}</td>
                      <td className="px-4 py-2">
                        {r.ai_generated ? (
                          <span className="text-xs font-medium rounded bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200 px-2 py-0.5">
                            AI
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {countByRuleset.get(r.id as string) ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "active"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
      : status === "draft"
        ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        : "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
  return (
    <span className={`text-xs font-medium rounded px-2 py-0.5 ${cls}`}>
      {status}
    </span>
  );
}
