import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCommitteeIdsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data: candidates, error: cErr } = await supabase
    .from("candidates")
    .select("id")
    .eq("user_id", userId);

  if (cErr || !candidates?.length) return [];

  const candidateIds = candidates.map((c) => c.id);
  const { data: committees, error: comErr } = await supabase
    .from("committees")
    .select("id")
    .in("candidate_id", candidateIds);

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
      candidates ( name, election_year )
    `
    )
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => {
    const raw = row.candidates as
      | { name: string; election_year: number }
      | { name: string; election_year: number }[]
      | null;
    const cand = Array.isArray(raw) ? raw[0] : raw;
    const label = cand
      ? `${cand.name} (${cand.election_year})`
      : `Committee ${row.id.slice(0, 8)}…`;
    return { id: row.id, label };
  });
}
