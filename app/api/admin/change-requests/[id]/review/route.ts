import { adminOr403 } from "@/lib/admin/api-auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { NextResponse } from "next/server";

type ProposedTemplate = {
  template_id?: string;
  patch?: Record<string, unknown>;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await adminOr403();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  let body: { action?: string; review_notes?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const action = body.action === "reject" ? "reject" : "approve";
  const admin = createServiceRoleClient();

  const { data: row, error } = await admin
    .from("ruleset_change_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (row.status !== "pending") {
    return NextResponse.json({ error: "Already reviewed" }, { status: 400 });
  }

  if (action === "reject") {
    const { error: up } = await admin
      .from("ruleset_change_requests")
      .update({
        status: "rejected",
        reviewed_by: auth.user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: body.review_notes ?? null,
      })
      .eq("id", id);

    if (up) {
      return NextResponse.json({ error: up.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  const proposed = row.proposed_changes as {
    templates?: ProposedTemplate[];
  } | null;

  for (const t of proposed?.templates ?? []) {
    if (t.template_id && t.patch && typeof t.patch === "object") {
      const { error: te } = await admin
        .from("deadline_templates")
        .update(t.patch)
        .eq("id", t.template_id);
      if (te) {
        return NextResponse.json({ error: te.message }, { status: 500 });
      }
    }
  }

  const { error: up } = await admin
    .from("ruleset_change_requests")
    .update({
      status: "approved",
      reviewed_by: auth.user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: body.review_notes ?? null,
    })
    .eq("id", id);

  if (up) {
    return NextResponse.json({ error: up.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "approved" });
}
