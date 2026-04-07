import type { SupabaseClient } from "@supabase/supabase-js";
import { addCalendarDays } from "./denver-date";
import { computeDueDate, parseFilingRule, type RuleParseContext } from "./deadline-rules";
import { findActiveRulesetId } from "./active-ruleset";
import { conventionPartyKey, templatePartyMatches } from "./party";

export type GenerateDeadlinesOptions = {
  /** When true, notify committee owner if ruleset version increased vs previous snapshot. */
  notifyOnRulesetVersionBump?: boolean;
};

// TODO: expand state guard as new states are onboarded

type CommitteeRow = {
  id: string;
  entity_type: string | null;
  candidate_id: string | null;
  filing_jurisdiction_type: string;
  filing_jurisdiction_name: string | null;
  ruleset_id: string | null;
};

type CandidateRow = {
  id: string;
  user_id: string;
  race_type: string;
  party: string | null;
  election_year: number;
  regulatory_state: string | null;
  primary_election_date: string | null;
  general_election_date: string | null;
  convention_date_override: string | null;
  convention_date_source: string | null;
  district_county_scope: string | null;
  district_number: number | null;
};

type TemplateRow = {
  id: string;
  race_types: string[] | null;
  party_affiliation: string | null;
  report_name: string;
  rule_type: string;
  fixed_date: string | null;
  days_offset: number | null;
  reference_election_type: string | null;
  filing_period_start_rule: string | null;
  filing_period_end_rule: string | null;
  deadline_time: string;
  fine_amount: number | null;
  disqualification_risk: boolean;
  grace_period_hours: number | null;
  sort_order: number;
};

function jurisdictionNameForRulesetLookup(
  filingType: string,
  filingName: string | null
): string | null {
  if (filingType === "lieutenant_governor") return null;
  const n = filingName?.trim();
  if (!n) return null;
  return n;
}

async function loadConventionDate(
  supabase: SupabaseClient,
  candidate: CandidateRow
): Promise<string | null> {
  if (candidate.convention_date_override) {
    return candidate.convention_date_override;
  }

  const party = conventionPartyKey(candidate.party);
  const state = candidate.regulatory_state ?? "Utah";
  const year = candidate.election_year;

  if (!party) {
    for (const p of ["Democratic", "Republican"] as const) {
      const { data: sw } = await supabase
        .from("convention_dates")
        .select("convention_date")
        .eq("party", p)
        .eq("state", state)
        .eq("election_year", year)
        .eq("jurisdiction", "statewide")
        .maybeSingle();
      if (sw?.convention_date) return sw.convention_date as string;
    }
    return null;
  }

  let countyJurisdiction: string | null = null;
  if (
    candidate.district_county_scope === "single_county" &&
    candidate.district_number != null &&
    ["state_house", "state_senate", "state_school_board"].includes(candidate.race_type)
  ) {
    const { data: mapRow } = await supabase
      .from("district_county_map")
      .select("counties")
      .eq("race_type", candidate.race_type)
      .eq("district_number", candidate.district_number)
      .eq("state", state)
      .maybeSingle();

    const counties = mapRow?.counties as string[] | undefined;
    if (counties?.[0]) {
      countyJurisdiction = `${counties[0]} County`;
    }
  }

  if (countyJurisdiction) {
    const { data: county } = await supabase
      .from("convention_dates")
      .select("convention_date")
      .eq("party", party)
      .eq("state", state)
      .eq("election_year", year)
      .eq("jurisdiction", countyJurisdiction)
      .maybeSingle();
    if (county?.convention_date) {
      return county.convention_date as string;
    }
  }

  const { data: wide } = await supabase
    .from("convention_dates")
    .select("convention_date")
    .eq("party", party)
    .eq("state", state)
    .eq("election_year", year)
    .eq("jurisdiction", "statewide")
    .maybeSingle();

  return (wide?.convention_date as string | undefined) ?? null;
}

/** Dummy date only when no template references convention (parseFilingRule may still run). */
function ctxPlaceholderConvention(electionYear: number): string {
  return `${electionYear}-01-02`;
}

function templateApplies(t: TemplateRow, raceType: string, candidateParty: string | null) {
  if (
    t.report_name === "Convention Report" &&
    (candidateParty ?? "").toLowerCase().includes("unaffiliated")
  ) {
    return false;
  }
  if (t.race_types?.length) {
    if (!t.race_types.includes(raceType)) return false;
  }
  return templatePartyMatches(t.party_affiliation, candidateParty);
}

export async function generateCommitteeDeadlines(
  supabase: SupabaseClient,
  committeeId: string,
  options: GenerateDeadlinesOptions = {}
): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  const { data: committee, error: cErr } = await supabase
    .from("committees")
    .select(
      "id, entity_type, candidate_id, filing_jurisdiction_type, filing_jurisdiction_name, ruleset_id"
    )
    .eq("id", committeeId)
    .maybeSingle();

  if (cErr || !committee) {
    return { ok: false, error: cErr?.message ?? "Committee not found" };
  }

  const com = committee as CommitteeRow;

  if (com.entity_type !== "candidate") {
    return { ok: true, skipped: "entity_type is not candidate" };
  }

  const { data: candidate, error: candErr } = await supabase
    .from("candidates")
    .select(
      "id, user_id, race_type, party, election_year, regulatory_state, primary_election_date, general_election_date, convention_date_override, convention_date_source, district_county_scope, district_number"
    )
    .eq("id", com.candidate_id!)
    .maybeSingle();

  if (candErr || !candidate) {
    return { ok: false, error: candErr?.message ?? "Candidate not found" };
  }

  const cand = candidate as CandidateRow;

  if ((cand.regulatory_state ?? "").trim() !== "Utah") {
    return { ok: true, skipped: "regulatory_state is not Utah" };
  }

  const jn = jurisdictionNameForRulesetLookup(
    com.filing_jurisdiction_type,
    com.filing_jurisdiction_name
  );

  const rulesetId = await findActiveRulesetId(supabase, {
    state: cand.regulatory_state ?? "Utah",
    jurisdictionType: com.filing_jurisdiction_type,
    jurisdictionName: jn,
    electionYear: cand.election_year,
  });

  if (!rulesetId) {
    return { ok: true, skipped: "No active ruleset for this jurisdiction" };
  }

  let priorVersion: number | null = null;
  if (com.ruleset_id) {
    const { data: priorRs } = await supabase
      .from("jurisdiction_rulesets")
      .select("version")
      .eq("id", com.ruleset_id)
      .maybeSingle();
    priorVersion = (priorRs?.version as number | undefined) ?? null;
  }

  const { data: nextRs } = await supabase
    .from("jurisdiction_rulesets")
    .select("version")
    .eq("id", rulesetId)
    .maybeSingle();

  const nextVersion = (nextRs?.version as number | undefined) ?? 1;

  const { error: upErr } = await supabase
    .from("committees")
    .update({ ruleset_id: rulesetId })
    .eq("id", committeeId);

  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  const { data: templates, error: tErr } = await supabase
    .from("deadline_templates")
    .select("*")
    .eq("ruleset_id", rulesetId)
    .order("sort_order", { ascending: true });

  if (tErr) {
    return { ok: false, error: tErr.message };
  }

  const list = (templates ?? []) as TemplateRow[];
  const applicable = list.filter((t) =>
    templateApplies(t, cand.race_type, cand.party)
  );

  function templateUsesConvention(t: TemplateRow) {
    if (t.rule_type === "relative_to_convention") return true;
    const a = t.filing_period_start_rule ?? "";
    const b = t.filing_period_end_rule ?? "";
    return (
      a.includes("convention") ||
      b.includes("convention") ||
      a === "day_after_convention"
    );
  }

  const needsConvention = applicable.some(templateUsesConvention);
  const conventionDate = needsConvention
    ? await loadConventionDate(supabase, cand)
    : ctxPlaceholderConvention(cand.election_year);

  if (needsConvention && !conventionDate) {
    return {
      ok: false,
      error:
        "Could not resolve convention date (set override or add convention_dates rows).",
    };
  }

  const ctx: RuleParseContext = {
    electionYear: cand.election_year,
    conventionDate: conventionDate!,
    primaryElectionDate: cand.primary_election_date,
    generalElectionDate: cand.general_election_date,
  };

  let lastPeriodEnd: string | null = null;
  const rows: Record<string, unknown>[] = [];

  for (const t of applicable) {
    const dueDate = computeDueDate({
      ruleType: t.rule_type,
      fixedDate: t.fixed_date,
      daysOffset: t.days_offset,
      referenceElectionType: t.reference_election_type,
      ctx,
      priorPeriodEnd: lastPeriodEnd,
    });

    if (!dueDate) {
      continue;
    }

    const periodStart =
      parseFilingRule(t.filing_period_start_rule, ctx) ??
      addCalendarDays(dueDate, -30);
    let periodEnd = parseFilingRule(t.filing_period_end_rule, ctx);
    if (!periodEnd) {
      periodEnd = addCalendarDays(dueDate, -1);
    }

    let ps = periodStart;
    let pe = periodEnd;
    if (ps > pe) {
      const tmp = ps;
      ps = pe;
      pe = tmp;
    }

    lastPeriodEnd = pe;

    rows.push({
      committee_id: committeeId,
      deadline_name: t.report_name,
      filing_period_start: ps,
      filing_period_end: pe,
      due_date: dueDate,
      completed: false,
      template_id: t.id,
      ruleset_id: rulesetId,
      rule_type: t.rule_type,
      fine_amount: t.fine_amount,
      disqualification_risk: t.disqualification_risk,
      grace_period_hours: t.grace_period_hours,
      deadline_time: t.deadline_time ?? "23:59",
      alert_sent_7_day: false,
      alert_sent_3_day: false,
      alert_sent_day_of: false,
    });
  }

  await supabase
    .from("filing_deadlines")
    .delete()
    .eq("committee_id", committeeId)
    .not("template_id", "is", null);

  if (rows.length) {
    const { error: insErr } = await supabase.from("filing_deadlines").insert(rows);
    if (insErr) {
      return { ok: false, error: insErr.message };
    }
  }

  const shouldNotify =
    options.notifyOnRulesetVersionBump === true &&
    com.ruleset_id != null &&
    priorVersion != null &&
    nextVersion > priorVersion;

  if (shouldNotify) {
    const rsNameRow = await supabase
      .from("jurisdiction_rulesets")
      .select("name")
      .eq("id", rulesetId)
      .maybeSingle();
    const name = (rsNameRow.data?.name as string) ?? "Jurisdiction ruleset";

    await supabase.from("notifications").insert({
      user_id: cand.user_id,
      committee_id: committeeId,
      notification_type: "ruleset_updated",
      title: "Compliance rules updated",
      message: `${name} is now version ${nextVersion}. Your filing deadlines were regenerated.`,
      read: false,
      related_id: rulesetId,
    });
  }

  return { ok: true };
}
