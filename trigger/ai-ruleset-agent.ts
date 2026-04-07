import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { logger, task } from "@trigger.dev/sdk";

/**
 * Manual / scheduled scan for ruleset changes. Uses HTTP fetch (no Cursor web_search in workers).
 * Set AI_RULESET_SEARCH_URL (optional) to an endpoint that returns JSON hints, or rely on heuristics.
 */
export const aiRulesetAgent = task({
  id: "ai-ruleset-agent",
  maxDuration: 600,
  run: async (payload: {
    state?: string;
    jurisdiction_type?: string;
    election_year?: number;
  }) => {
    const state = payload.state ?? "Utah";
    const jurisdictionType = payload.jurisdiction_type ?? "lieutenant_governor";
    const electionYear = payload.election_year ?? 2026;

    const supabase = createServiceRoleClient();

    const { data: active } = await supabase
      .from("jurisdiction_rulesets")
      .select("id, name, version")
      .eq("state", state)
      .eq("jurisdiction_type", jurisdictionType)
      .eq("election_year", electionYear)
      .eq("entity_scope", "candidate")
      .eq("status", "active")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const searchUrl = process.env.AI_RULESET_SEARCH_URL;
    let sourceUrl: string | null = null;
    let summary = "Automated ruleset scan completed; no external API configured.";

    if (searchUrl) {
      try {
        const u = new URL(searchUrl);
        u.searchParams.set("state", state);
        u.searchParams.set("year", String(electionYear));
        const res = await fetch(u.toString(), { method: "GET" });
        if (res.ok) {
          const j = (await res.json()) as { url?: string; summary?: string };
          sourceUrl = j.url ?? searchUrl;
          summary = j.summary ?? "External search returned OK.";
        }
      } catch (e) {
        logger.warn("AI_RULESET_SEARCH_URL fetch failed", {
          message: e instanceof Error ? e.message : String(e),
        });
      }
    } else {
      sourceUrl =
        "https://elections.utah.gov/candidates-and-office-holders/campaign-finance";
      summary =
        "Placeholder scan: verify Utah Office of the Lieutenant Governor / elections.utah.gov campaign finance pages for updates.";
    }

    const proposed_changes = {
      scanned_at: new Date().toISOString(),
      active_ruleset: active ?? null,
      confidence: "low" as const,
      note:
        "No automatic diff applied. Review official sources and edit templates manually or approve structured change requests when implemented.",
      queries: [
        `${state} campaign finance filing deadlines ${electionYear}`,
        `${state} lieutenant governor campaign finance rules ${electionYear}`,
      ],
    };

    const { data: inserted, error: insErr } = await supabase
      .from("ruleset_change_requests")
      .insert({
        ruleset_id: active?.id ?? null,
        change_type: "update_ruleset_metadata",
        proposed_changes: proposed_changes,
        source: "ai_agent",
        source_url: sourceUrl,
        source_description: summary,
        status: "pending",
      })
      .select("id")
      .single();

    if (insErr) {
      throw new Error(insErr.message);
    }

    const { data: admins } = await supabase.from("admin_users").select("id");

    for (const a of admins ?? []) {
      await supabase.from("notifications").insert({
        user_id: a.id as string,
        committee_id: null,
        notification_type: "ruleset_updated",
        title: "AI ruleset review suggested",
        message: `AI agent recorded a pending ruleset check for ${state} (${jurisdictionType}, ${electionYear}). Please review change requests.`,
        read: false,
        related_id: inserted?.id ?? null,
      });
    }

    logger.info("ai-ruleset-agent completed", { requestId: inserted?.id });

    return { changeRequestId: inserted?.id };
  },
});
