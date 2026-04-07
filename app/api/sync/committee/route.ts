import type { actblueSyncCommittee } from "@/trigger/actblue-sync";
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

  const { data: access } = await supabase
    .from("committees")
    .select("id")
    .eq("id", committeeId)
    .maybeSingle();

  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await tasks.trigger<typeof actblueSyncCommittee>("actblue-sync-committee", {
    committeeId,
  });

  return NextResponse.json({ triggered: true });
}
