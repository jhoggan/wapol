import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCommitteeIdsForUser(
  supabase: SupabaseClient,
  _userId: string
): Promise<string[]> {
  const { data: committees, error: comErr } = await supabase
    .from("committees")
    .select("id");

  if (comErr || !committees?.length) return [];
  return committees.map((c) => c.id);
}

export type CommitteeOption = { id: string; label: string };

export type DashboardCommittee = {
  id: string;
  entityType: string;
  committeeName: string;
  entityName: string;
  label: string;
  typeLabel: string;
};

function entityTypeLabel(entityType: string): string {
  switch (entityType) {
    case "candidate":
      return "Candidate committee";
    case "political_group":
      return "Political group";
    default:
      return entityType || "Committee";
  }
}

export async function getDashboardCommittees(
  supabase: SupabaseClient
): Promise<DashboardCommittee[]> {
  const { data, error } = await supabase
    .from("committees")
    .select(
      `
      id,
      entity_type,
      candidates (
        name,
        first_name,
        last_name,
        committee_name,
        committee_legal_name,
        election_year
      ),
      political_groups ( legal_name, first_name, last_name )
    `
    )
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => {
    const candRaw = row.candidates as
      | {
          name: string | null;
          first_name: string | null;
          last_name: string | null;
          committee_name: string | null;
          committee_legal_name: string | null;
          election_year: number;
        }
      | {
          name: string | null;
          first_name: string | null;
          last_name: string | null;
          committee_name: string | null;
          committee_legal_name: string | null;
          election_year: number;
        }[]
      | null;
    const cand = Array.isArray(candRaw) ? candRaw[0] : candRaw;
    const pgRaw = row.political_groups as
      | { legal_name: string; first_name: string; last_name: string }
      | { legal_name: string; first_name: string; last_name: string }[]
      | null;
    const pg = Array.isArray(pgRaw) ? pgRaw[0] : pgRaw;

    const entityType = (row.entity_type as string) ?? "candidate";

    let committeeName: string;
    let entityName: string;
    let label: string;

    if (cand) {
      committeeName =
        cand.committee_name?.trim() ||
        cand.committee_legal_name?.trim() ||
        cand.name?.trim() ||
        "Committee";
      entityName =
        cand.name?.trim() ||
        [cand.first_name, cand.last_name].filter(Boolean).join(" ").trim() ||
        "—";
      label = cand.name
        ? `${cand.name} (${cand.election_year})`
        : `${committeeName} (${cand.election_year})`;
    } else if (pg) {
      committeeName = pg.legal_name?.trim() || "Committee";
      entityName = pg.legal_name?.trim() || "—";
      label = pg.legal_name;
    } else {
      committeeName = `Committee ${row.id.slice(0, 8)}…`;
      entityName = "—";
      label = committeeName;
    }

    return {
      id: row.id,
      entityType,
      committeeName,
      entityName,
      label,
      typeLabel: entityTypeLabel(entityType),
    };
  });
}

export async function getCommitteesForSelect(
  supabase: SupabaseClient
): Promise<CommitteeOption[]> {
  const rows = await getDashboardCommittees(supabase);
  return rows.map((r) => ({ id: r.id, label: r.label }));
}
