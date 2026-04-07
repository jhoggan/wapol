import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  addCalendarDays,
  daysBetween,
  denverDateString,
} from "@/lib/compliance/denver-date";
import { logger, schedules } from "@trigger.dev/sdk";

// TODO: expand state guard as new states are onboarded

const WINDOW_DATES = ["2026-05-24", "2026-10-04"] as const;

export const contributionAlerts = schedules.task({
  id: "contribution-alerts",
  cron: { pattern: "0 6 * * *", timezone: "America/Denver" },
  maxDuration: 3600,
  run: async () => {
    const supabase = createServiceRoleClient();
    const today = denverDateString();
    const since = addCalendarDays(today, -35);

    const { data: contributions, error } = await supabase
      .from("contributions")
      .select("id, committee_id, date")
      .eq("refunded", false)
      .gte("date", since);

    if (error) {
      throw new Error(error.message);
    }

    const list = contributions ?? [];
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

    for (const row of list) {
      const com = comById.get(row.committee_id as string);
      if (!com || com.entity_type !== "candidate" || !com.candidate_id) continue;

      const cand = candById.get(com.candidate_id);
      if (!cand || (cand.regulatory_state ?? "").trim() !== "Utah") continue;

      const contribDate = row.date as string;
      const age = daysBetween(contribDate, today);

      const { data: deadlines } = await supabase
        .from("filing_deadlines")
        .select("filing_period_start, filing_period_end")
        .eq("committee_id", com.id)
        .eq("completed", true);

      const covered = (deadlines ?? []).some((d) => {
        const a = d.filing_period_start as string;
        const b = d.filing_period_end as string;
        return contribDate >= a && contribDate <= b;
      });

      if (covered) {
        await supabase
          .from("contribution_alerts")
          .update({ resolved: true, resolved_at: new Date().toISOString() })
          .eq("contribution_id", row.id)
          .eq("resolved", false);
        continue;
      }

      const { data: existing31w } = await supabase
        .from("contribution_alerts")
        .select("id")
        .eq("contribution_id", row.id)
        .eq("alert_type", "31_day_warning")
        .maybeSingle();

      if (age >= 21 && age < 28 && !existing31w) {
        const due = addCalendarDays(contribDate, 31);
        await supabase.from("contribution_alerts").insert({
          contribution_id: row.id,
          committee_id: com.id,
          alert_type: "31_day_warning",
          due_date: due,
        });
        await supabase.from("notifications").insert({
          user_id: cand.user_id,
          committee_id: com.id,
          notification_type: "contribution_31_day_warning",
          title: "Contribution approaching 31-day deadline",
          message: `A contribution received ${contribDate} must be reported by ${due}.`,
          read: false,
          related_id: row.id,
        });
      }

      const { data: existing31f } = await supabase
        .from("contribution_alerts")
        .select("id")
        .eq("contribution_id", row.id)
        .eq("alert_type", "31_day_final")
        .maybeSingle();

      if (age >= 28 && age < 31 && !existing31f) {
        const due = addCalendarDays(contribDate, 31);
        await supabase.from("contribution_alerts").insert({
          contribution_id: row.id,
          committee_id: com.id,
          alert_type: "31_day_final",
          due_date: due,
        });
        await supabase.from("notifications").insert({
          user_id: cand.user_id,
          committee_id: com.id,
          notification_type: "contribution_31_day_final",
          title: "Contribution 31-day deadline in 3 days",
          message: `Reporting for a contribution from ${contribDate} is due by ${due}.`,
          read: false,
          related_id: row.id,
        });
      }
    }

    for (const dueDate of WINDOW_DATES) {
      if (today < dueDate) continue;

      const { data: candCommittees } = await supabase
        .from("committees")
        .select("id, candidate_id")
        .eq("entity_type", "candidate")
        .not("candidate_id", "is", null);

      for (const c of candCommittees ?? []) {
        const { data: candRow } = await supabase
          .from("candidates")
          .select("id, user_id, regulatory_state")
          .eq("id", c.candidate_id as string)
          .maybeSingle();

        if (!candRow || (candRow.regulatory_state ?? "").trim() !== "Utah") {
          continue;
        }

        const { data: hit } = await supabase
          .from("contribution_alerts")
          .select("id")
          .eq("committee_id", c.id)
          .eq("alert_type", "7_day_window_open")
          .eq("due_date", dueDate)
          .maybeSingle();

        if (hit) continue;

        await supabase.from("contribution_alerts").insert({
          contribution_id: null,
          committee_id: c.id,
          alert_type: "7_day_window_open",
          due_date: dueDate,
        });

        await supabase.from("notifications").insert({
          user_id: candRow.user_id,
          committee_id: c.id,
          notification_type: "7_day_window_open",
          title: "7-day reporting window",
          message: `A compliance window tied to ${dueDate} is open for your committee.`,
          read: false,
          related_id: null,
        });
      }
    }

    logger.info("contribution-alerts completed", {
      contributions: list.length,
      today,
    });

    return { processed: list.length, today };
  },
});
