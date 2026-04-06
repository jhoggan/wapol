import Link from "next/link";
import {
  jurisdictionTypeLabel,
  raceTypeLabel,
} from "@/lib/campaign-labels";
import { createClient } from "@/lib/supabase/server";

type CandidateEmbed = {
  name: string | null;
  race_type: string | null;
  committee_name: string | null;
};

type PoliticalGroupEmbed = {
  legal_name: string;
};

type CommitteeRow = {
  id: string;
  entity_type: string;
  treasurer_name: string | null;
  filing_jurisdiction_type: string;
  filing_jurisdiction_name: string;
  filing_status: string;
  candidates: CandidateEmbed | CandidateEmbed[] | null;
  political_groups: PoliticalGroupEmbed | PoliticalGroupEmbed[] | null;
};

function normalizeCandidate(
  raw: CandidateEmbed | CandidateEmbed[] | null
): CandidateEmbed | null {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

function normalizePoliticalGroup(
  raw: PoliticalGroupEmbed | PoliticalGroupEmbed[] | null
): PoliticalGroupEmbed | null {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

export default async function CommitteesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: rows } = await supabase
    .from("committees")
    .select(
      `
      id,
      entity_type,
      treasurer_name,
      filing_jurisdiction_type,
      filing_jurisdiction_name,
      filing_status,
      candidates ( name, race_type, committee_name ),
      political_groups ( legal_name )
    `
    )
    .order("created_at", { ascending: true });

  const list = (rows ?? []) as CommitteeRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Committees
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Your candidate committees and political groups.
          </p>
        </div>
        <Link
          href="/dashboard/committees/new"
          className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          New committee
        </Link>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-neutral-500 dark:text-neutral-400">
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Committee name
                </th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Candidate
                </th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Race type
                </th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Filing jurisdiction
                </th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Jurisdiction name
                </th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Treasurer
                </th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Filing status
                </th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-neutral-500"
                  >
                    No committees yet.{" "}
                    <Link
                      href="/dashboard/committees/new"
                      className="font-medium text-neutral-900 dark:text-neutral-100 underline underline-offset-2"
                    >
                      Create one
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                list.map((row) => {
                  const cand = normalizeCandidate(row.candidates);
                  const pg = normalizePoliticalGroup(row.political_groups);
                  const committeeLabel =
                    cand?.committee_name?.trim() ||
                    pg?.legal_name ||
                    "—";
                  const subjectLabel = cand?.name ?? pg?.legal_name ?? "—";
                  const raceLabel =
                    row.entity_type === "political_group"
                      ? "—"
                      : cand?.race_type
                        ? raceTypeLabel(cand.race_type)
                        : "—";
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-neutral-100 dark:border-neutral-800/80"
                    >
                      <td className="px-4 py-2.5 text-neutral-900 dark:text-neutral-100">
                        {committeeLabel}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-900 dark:text-neutral-100">
                        {subjectLabel}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300">
                        {raceLabel}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300">
                        {jurisdictionTypeLabel(row.filing_jurisdiction_type)}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300">
                        {row.filing_jurisdiction_name}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300">
                        {row.treasurer_name?.trim() ? row.treasurer_name : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300">
                        {row.filing_status}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
