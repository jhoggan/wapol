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

export async function getCommitteesForSelect(
  supabase: SupabaseClient
): Promise<CommitteeOption[]> {
  const { data, error } = await supabase
    .from("committees")
    .select(
      `
      id,
      candidates ( name, election_year ),
      political_groups ( legal_name )
    `
    )
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => {
    const candRaw = row.candidates as
      | { name: string | null; election_year: number }
      | { name: string | null; election_year: number }[]
      | null;
    const cand = Array.isArray(candRaw) ? candRaw[0] : candRaw;
    const pgRaw = row.political_groups as
      | { legal_name: string }
      | { legal_name: string }[]
      | null;
    const pg = Array.isArray(pgRaw) ? pgRaw[0] : pgRaw;

    let label: string;
    if (cand?.name) {
      label = `${cand.name} (${cand.election_year})`;
    } else if (pg?.legal_name) {
      label = pg.legal_name;
    } else {
      label = `Committee ${row.id.slice(0, 8)}…`;
    }
    return { id: row.id, label };
  });
}
