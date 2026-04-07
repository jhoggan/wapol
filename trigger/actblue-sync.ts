import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { runActBlueSyncForCommittee } from "@/lib/actblue/sync-committee";
import { schedules, task } from "@trigger.dev/sdk";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Manual / API: sync a single committee. */
export const actblueSyncCommittee = task({
  id: "actblue-sync-committee",
  maxDuration: 900,
  run: async (payload: { committeeId: string }) => {
    const supabase = createServiceRoleClient();
    return runActBlueSyncForCommittee({
      supabase,
      committeeId: payload.committeeId,
    });
  },
});

/** Daily 09:00 UTC. */
export const actblueDailySync = schedules.task({
  id: "actblue-daily-sync",
  cron: "0 9 * * *",
  maxDuration: 3600,
  run: async () => {
    const supabase = createServiceRoleClient();
    const { data: committees, error } = await supabase
      .from("committees")
      .select("id")
      .not("actblue_client_uuid", "is", null)
      .not("actblue_client_secret", "is", null);

    if (error) {
      throw new Error(error.message);
    }

    const list = committees ?? [];
    for (let i = 0; i < list.length; i += 1) {
      if (i > 0) {
        await sleep(1000);
      }
      try {
        await runActBlueSyncForCommittee({
          supabase,
          committeeId: list[i].id,
        });
      } catch (e) {
        console.error(
          "ActBlue daily sync failed for committee",
          list[i].id,
          e instanceof Error ? e.message : e
        );
      }
    }
  },
});
