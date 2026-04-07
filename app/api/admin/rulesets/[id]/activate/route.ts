import type { generateCommitteeDeadlinesTask } from "@/trigger/generate-committee-deadlines";
import { adminOr403 } from "@/lib/admin/api-auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!process.env.TRIGGER_SECRET_KEY) {
    return NextResponse.json(
      { error: "Trigger.dev is not configured (TRIGGER_SECRET_KEY)." },
      { status: 503 }
    );
  }

  const auth = await adminOr403();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const admin = createServiceRoleClient();

  const { data: rs, error } = await admin
    .from("jurisdiction_rulesets")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !rs) {
    return NextResponse.json({ error: "Ruleset not found" }, { status: 404 });
  }

  if (rs.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft rulesets can be activated" },
      { status: 400 }
    );
  }

  let q = admin
    .from("jurisdiction_rulesets")
    .update({ status: "archived" })
    .eq("state", rs.state)
    .eq("jurisdiction_type", rs.jurisdiction_type)
    .eq("election_year", rs.election_year)
    .eq("entity_scope", rs.entity_scope)
    .eq("status", "active")
    .neq("id", id);

  if (rs.jurisdiction_name == null || rs.jurisdiction_name === "") {
    q = q.is("jurisdiction_name", null);
  } else {
    q = q.eq("jurisdiction_name", rs.jurisdiction_name);
  }

  const { error: archiveErr } = await q;
  if (archiveErr) {
    return NextResponse.json(
      { error: `Failed to archive prior active ruleset: ${archiveErr.message}` },
      { status: 500 }
    );
  }

  const nextVersion = (rs.version as number) + 1;

  const { error: upErr } = await admin
    .from("jurisdiction_rulesets")
    .update({
      status: "active",
      version: nextVersion,
      approved_at: new Date().toISOString(),
      approved_by: auth.user.id,
    })
    .eq("id", id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const jn = (rs.jurisdiction_name as string | null)?.trim() || null;

  const { data: committees } = await admin
    .from("committees")
    .select("id, filing_jurisdiction_type, filing_jurisdiction_name, candidate_id")
    .eq("entity_type", "candidate")
    .not("candidate_id", "is", null)
    .eq("filing_jurisdiction_type", rs.jurisdiction_type);

  const candidateIds = [
    ...new Set(
      (committees ?? [])
        .map((c) => c.candidate_id as string)
        .filter(Boolean)
    ),
  ];

  const { data: candidates } = await admin
    .from("candidates")
    .select("id, election_year, regulatory_state")
    .in("id", candidateIds);

  const candById = new Map(
    (candidates ?? []).map((c) => [c.id as string, c])
  );

  const targets =
    committees?.filter((c) => {
      const cand = candById.get(c.candidate_id as string);
      if (!cand) return false;
      if ((cand.regulatory_state as string) !== rs.state) return false;
      if ((cand.election_year as number) !== rs.election_year) return false;
      const fn = (c.filing_jurisdiction_name as string | null)?.trim() || "";
      if (jn === null) {
        return true;
      }
      return fn.toLowerCase() === jn.toLowerCase();
    }) ?? [];

  for (const c of targets) {
    await tasks.trigger<typeof generateCommitteeDeadlinesTask>(
      "generate-committee-deadlines",
      { committee_id: c.id as string, notify_ruleset_version_bump: true }
    );
  }

  return NextResponse.json({
    activated: true,
    version: nextVersion,
    committees_queued: targets.length,
  });
}
