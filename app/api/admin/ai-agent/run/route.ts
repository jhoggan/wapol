import type { aiRulesetAgent } from "@/trigger/ai-ruleset-agent";
import { adminOr403 } from "@/lib/admin/api-auth";
import { tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!process.env.TRIGGER_SECRET_KEY) {
    return NextResponse.json(
      { error: "Trigger.dev is not configured (TRIGGER_SECRET_KEY)." },
      { status: 503 }
    );
  }

  const auth = await adminOr403();
  if (auth instanceof NextResponse) return auth;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const state = typeof body.state === "string" ? body.state : undefined;
  const jurisdiction_type =
    typeof body.jurisdiction_type === "string"
      ? body.jurisdiction_type
      : undefined;
  const election_year =
    typeof body.election_year === "number" ? body.election_year : undefined;

  await tasks.trigger<typeof aiRulesetAgent>("ai-ruleset-agent", {
    state,
    jurisdiction_type,
    election_year,
  });

  return NextResponse.json({ triggered: true });
}
