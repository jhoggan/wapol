import type { generateCommitteeDeadlinesTask } from "@/trigger/generate-committee-deadlines";
import { createClient } from "@/lib/supabase/server";
import { tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!process.env.TRIGGER_SECRET_KEY) {
    return NextResponse.json(
      { error: "Trigger.dev is not configured (TRIGGER_SECRET_KEY)." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const committeeId =
    typeof body === "object" &&
    body !== null &&
    "committee_id" in body &&
    typeof (body as { committee_id: unknown }).committee_id === "string"
      ? (body as { committee_id: string }).committee_id.trim()
      : "";

  if (!committeeId) {
    return NextResponse.json(
      { error: "committee_id is required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row, error } = await supabase
    .from("committees")
    .select("id, candidates!inner(user_id)")
    .eq("id", committeeId)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cand = row.candidates as unknown as { user_id: string };
  const ownerId = cand.user_id;
  if (ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await tasks.trigger<typeof generateCommitteeDeadlinesTask>(
    "generate-committee-deadlines",
    { committee_id: committeeId }
  );

  return NextResponse.json({ triggered: true });
}
