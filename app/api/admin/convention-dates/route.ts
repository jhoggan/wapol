import { adminOr403 } from "@/lib/admin/api-auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const auth = await adminOr403();
  if (auth instanceof NextResponse) return auth;

  let body: {
    party?: string;
    state?: string;
    election_year?: number;
    convention_date?: string;
    jurisdiction?: string;
    notes?: string;
  } = {};

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    !body.party?.trim() ||
    !body.convention_date?.trim() ||
    body.election_year == null
  ) {
    return NextResponse.json(
      { error: "party, election_year, and convention_date are required" },
      { status: 400 }
    );
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("convention_dates")
    .insert({
      party: body.party.trim(),
      state: body.state?.trim() || "Utah",
      election_year: body.election_year,
      convention_date: body.convention_date.trim(),
      jurisdiction: body.jurisdiction?.trim() || "statewide",
      notes: body.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data?.id });
}
