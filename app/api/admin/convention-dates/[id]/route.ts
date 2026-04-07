import { adminOr403 } from "@/lib/admin/api-auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await adminOr403();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  let body: { convention_date?: string; notes?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, string | null> = {};
  if (typeof body.convention_date === "string") {
    patch.convention_date = body.convention_date;
  }
  if (typeof body.notes === "string") {
    patch.notes = body.notes;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("convention_dates")
    .update(patch)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
