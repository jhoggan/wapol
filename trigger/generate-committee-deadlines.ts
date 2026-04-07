import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { generateCommitteeDeadlines } from "@/lib/compliance/generate-committee-deadlines";
import { logger, task } from "@trigger.dev/sdk";

export const generateCommitteeDeadlinesTask = task({
  id: "generate-committee-deadlines",
  maxDuration: 600,
  run: async (payload: {
    committee_id: string;
    notify_ruleset_version_bump?: boolean;
  }) => {
    // TODO: expand state guard as new states are onboarded
    const supabase = createServiceRoleClient();
    const result = await generateCommitteeDeadlines(
      supabase,
      payload.committee_id,
      {
        notifyOnRulesetVersionBump: payload.notify_ruleset_version_bump === true,
      }
    );

    if (result.skipped) {
      logger.warn("generate-committee-deadlines skipped", {
        committee_id: payload.committee_id,
        reason: result.skipped,
      });
      return result;
    }

    if (!result.ok) {
      logger.error("generate-committee-deadlines failed", {
        committee_id: payload.committee_id,
        error: result.error,
      });
      throw new Error(result.error ?? "Deadline generation failed");
    }

    return result;
  },
});
