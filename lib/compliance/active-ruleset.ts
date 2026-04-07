import type { SupabaseClient } from "@supabase/supabase-js";

export type ActiveRulesetLookup = {
  state: string;
  jurisdictionType: string;
  jurisdictionName: string | null;
  electionYear: number;
};

/** Latest active candidate ruleset for jurisdiction (highest version). */
export async function findActiveRulesetId(
  supabase: SupabaseClient,
  p: ActiveRulesetLookup
): Promise<string | null> {
  const jn = p.jurisdictionName?.trim() || null;

  let q = supabase
    .from("jurisdiction_rulesets")
    .select("id, version")
    .eq("state", p.state)
    .eq("jurisdiction_type", p.jurisdictionType)
    .eq("election_year", p.electionYear)
    .eq("entity_scope", "candidate")
    .eq("status", "active")
    .order("version", { ascending: false })
    .limit(1);

  if (jn === null) {
    q = q.is("jurisdiction_name", null);
  } else {
    q = q.eq("jurisdiction_name", jn);
  }

  const { data, error } = await q.maybeSingle();
  if (error || !data) return null;
  return data.id as string;
}
