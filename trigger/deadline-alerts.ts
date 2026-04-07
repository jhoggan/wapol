import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { daysBetween, denverDateString } from "@/lib/compliance/denver-date";
import { logger, schedules } from "@trigger.dev/sdk";

// TODO: expand state guard as new states are onboarded

export const deadlineAlerts = schedules.task({
  id: "deadline-alerts",
  cron: { pattern: "0 7 * * *", timezone: "America/Denver" },
  maxDuration: 3600,
  run: async () => {
    const supabase = createServiceRoleClient();
    const today = denverDateString();

    const { data: rows, error } = await supabase
      .from("filing_deadlines")
      .select(
        "id, committee_id, due_date, deadline_name, fine_amount, disqualification_risk, grace_period_hours, alert_sent_7_day, alert_sent_3_day, alert_sent_day_of"
      )
      .eq("completed", false)
      .gte("due_date", today);

    if (error) {
      throw new Error(error.message);
    }

    const list = rows ?? [];
    const committeeIds = [...new Set(list.map((r) => r.committee_id as string))];

    const { data: committees } = await supabase
      .from("committees")
      .select("id, entity_type, candidate_id")
      .in("id", committeeIds);

    const comById = new Map(
      (committees ?? []).map((c) => [c.id as string, c])
    );

    const candidateIds = [
      ...new Set(
        (committees ?? [])
          .map((c) => c.candidate_id as string | null)
          .filter(Boolean) as string[]
      ),
    ];

    const { data: candidates } = await supabase
      .from("candidates")
      .select("id, user_id, regulatory_state")
      .in("id", candidateIds);

    const candById = new Map(
      (candidates ?? []).map((c) => [c.id as string, c])
    );

    for (const d of list) {
      const com = comById.get(d.committee_id as string);
      if (!com || com.entity_type !== "candidate" || !com.candidate_id) continue;

      const cand = candById.get(com.candidate_id);
      if (!cand || (cand.regulatory_state ?? "").trim() !== "Utah") continue;

      const due = d.due_date as string;
      const until = daysBetween(today, due);
      if (until < 0) continue;

      const fine = d.fine_amount as number | null;
      const dq = d.disqualification_risk as boolean;
      const grace = d.grace_period_hours as number | null;

      let suffix = "";
      if (fine != null) suffix += ` Fine: $${Number(fine).toFixed(2)}.`;
      if (dq) suffix += " Disqualification risk applies.";
      if (grace != null) suffix += ` Grace period: ${grace} hours.`;

      if (until === 7 && !d.alert_sent_7_day) {
        await supabase.from("notifications").insert({
          user_id: cand.user_id,
          committee_id: com.id,
          notification_type: "deadline_7_day",
          title: `Filing due in 7 days: ${d.deadline_name}`,
          message: `Your report "${d.deadline_name}" is due ${due}.${suffix}`,
          read: false,
          related_id: d.id,
        });
        await supabase
          .from("filing_deadlines")
          .update({ alert_sent_7_day: true })
          .eq("id", d.id);
      }

      if (until === 3 && !d.alert_sent_3_day) {
        await supabase.from("notifications").insert({
          user_id: cand.user_id,
          committee_id: com.id,
          notification_type: "deadline_3_day",
          title: `Filing due in 3 days: ${d.deadline_name}`,
          message: `Your report "${d.deadline_name}" is due ${due}.${suffix}`,
          read: false,
          related_id: d.id,
        });
        await supabase
          .from("filing_deadlines")
          .update({ alert_sent_3_day: true })
          .eq("id", d.id);
      }

      if (until === 0 && !d.alert_sent_day_of) {
        await supabase.from("notifications").insert({
          user_id: cand.user_id,
          committee_id: com.id,
          notification_type: "deadline_day_of",
          title: `Due today: ${d.deadline_name}`,
          message: `Urgent: "${d.deadline_name}" is due today (${due}).${suffix}`,
          read: false,
          related_id: d.id,
        });
        await supabase
          .from("filing_deadlines")
          .update({ alert_sent_day_of: true })
          .eq("id", d.id);
      }
    }

    logger.info("deadline-alerts completed", { today, rows: list.length });

    return { today, rows: list.length };
  },
});
