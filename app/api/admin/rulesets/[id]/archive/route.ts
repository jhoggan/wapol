import { adminOr403 } from "@/lib/admin/api-auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await adminOr403();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const admin = createServiceRoleClient();

  const { data: rs, error } = await admin
    .from("jurisdiction_rulesets")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (error || !rs) {
    return NextResponse.json({ error: "Ruleset not found" }, { status: 404 });
  }

  if (rs.status !== "active") {
    return NextResponse.json(
      { error: "Only active rulesets can be archived" },
      { status: 400 }
    );
  }

  const { error: upErr } = await admin
    .from("jurisdiction_rulesets")
    .update({ status: "archived" })
    .eq("id", id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ archived: true });
}
