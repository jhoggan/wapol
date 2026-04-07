import { jurisdictionTypeLabel } from "@/lib/campaign-labels";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RulesetActions } from "./ruleset-actions";

export default async function AdminRulesetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: rs } = await supabase
    .from("jurisdiction_rulesets")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!rs) notFound();

  const { data: templates } = await supabase
    .from("deadline_templates")
    .select("*")
    .eq("ruleset_id", id)
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/rulesets"
          className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          ← All rulesets
        </Link>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mt-2">
          {rs.name as string}
        </h1>
        <dl className="mt-4 grid gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          <div>
            <dt className="text-neutral-500 inline">State: </dt>
            <dd className="inline">{rs.state as string}</dd>
          </div>
          <div>
            <dt className="text-neutral-500 inline">Jurisdiction: </dt>
            <dd className="inline">
              {jurisdictionTypeLabel(rs.jurisdiction_type as string)}
              {(rs.jurisdiction_name as string | null)
                ? ` — ${rs.jurisdiction_name}`
                : ""}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500 inline">Election year: </dt>
            <dd className="inline">{rs.election_year as number}</dd>
          </div>
          <div>
            <dt className="text-neutral-500 inline">Status: </dt>
            <dd className="inline font-medium">{rs.status as string}</dd>
          </div>
          <div>
            <dt className="text-neutral-500 inline">Version: </dt>
            <dd className="inline">{rs.version as number}</dd>
          </div>
          {(rs.notes as string | null) ? (
            <div>
              <dt className="text-neutral-500">Notes</dt>
              <dd className="mt-1 text-neutral-700 dark:text-neutral-200">
                {rs.notes as string}
              </dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-6 flex flex-wrap gap-3 items-start">
          <RulesetActions rulesetId={id} status={rs.status as string} />
          <Link
            href={`/admin/rulesets/${id}/templates/new`}
            className="inline-flex rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-2 text-sm font-medium text-neutral-800 dark:text-neutral-200"
          >
            Add template
          </Link>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
          Deadline templates
        </h2>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-neutral-500 dark:text-neutral-400">
                <th className="px-3 py-2 font-medium">Report</th>
                <th className="px-3 py-2 font-medium">Races</th>
                <th className="px-3 py-2 font-medium">Party</th>
                <th className="px-3 py-2 font-medium">Rule</th>
                <th className="px-3 py-2 font-medium">Due</th>
                <th className="px-3 py-2 font-medium">Fine</th>
                <th className="px-3 py-2 font-medium">Risk</th>
                <th className="px-3 py-2 font-medium">Grace (h)</th>
              </tr>
            </thead>
            <tbody>
              {(templates ?? []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-neutral-500">
                    No templates
                  </td>
                </tr>
              ) : (
                (templates ?? []).map((t) => (
                  <tr
                    key={t.id as string}
                    className="border-b border-neutral-100 dark:border-neutral-800/80"
                  >
                    <td className="px-3 py-2 font-medium text-neutral-900 dark:text-neutral-100">
                      {t.report_name as string}
                    </td>
                    <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">
                      {(t.race_types as string[] | null)?.join(", ") ?? "All"}
                    </td>
                    <td className="px-3 py-2">
                      {(t.party_affiliation as string | null) ?? "All"}
                    </td>
                    <td className="px-3 py-2">{t.rule_type as string}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {t.rule_type === "fixed_date" && t.fixed_date
                        ? (t.fixed_date as string)
                        : t.days_offset != null
                          ? `offset ${t.days_offset}`
                          : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {t.fine_amount != null
                        ? `$${Number(t.fine_amount).toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {t.disqualification_risk ? (
                        <span className="text-xs font-medium text-red-700 dark:text-red-300">
                          Yes
                        </span>
                      ) : (
                        "No"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {t.grace_period_hours ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
