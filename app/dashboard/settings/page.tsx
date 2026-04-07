import { ActBlueSettingsSection } from "@/components/dashboard/actblue-settings-section";
import { SettingsClient } from "@/components/dashboard/settings-client";
import { SelectCommitteePrompt } from "@/components/dashboard/select-committee-prompt";
import { parseActBlueCredentialsMeta } from "@/lib/dashboard/actblue-credentials-meta";
import { getDashboardCommittees } from "@/lib/dashboard/scope";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ committee?: string }>;
}) {
  const { committee: committeeParam } = await searchParams;
  const committee = committeeParam?.trim() ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const committees = await getDashboardCommittees(supabase);
  const idSet = new Set(committees.map((c) => c.id));

  if (committees.length > 0 && (!committee || !idSet.has(committee))) {
    return (
      <SelectCommitteePrompt
        title="Settings"
        description="Choose a committee from the picker to open settings."
      />
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select(
      "filing_deadline_reminders, contribution_limit_alerts, product_updates"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const showActBlue = committee !== "" && idSet.has(committee);

  const activeMeta = committees.find((c) => c.id === committee);
  const committeeName =
    activeMeta?.committeeName ?? activeMeta?.label ?? "Committee";

  const { data: actblueRow } = showActBlue
    ? await supabase
        .from("committees")
        .select("actblue_client_uuid, actblue_last_synced_at")
        .eq("id", committee)
        .maybeSingle()
    : { data: null as null };

  const { data: abMetaRaw } = showActBlue
    ? await supabase.rpc("committee_actblue_credentials_meta", {
        p_committee_id: committee,
      })
    : { data: null as null };

  const abMeta = parseActBlueCredentialsMeta(abMetaRaw);
  const hasSavedSecret = abMeta.configured;
  const secretLast4 = abMeta.secretLastFour;

  return (
    <SettingsClient
      email={user.email}
      profile={profile}
      prefs={prefs}
      afterProfile={
        showActBlue ? (
          <ActBlueSettingsSection
            committeeId={committee}
            committeeName={committeeName}
            initialClientUuid={actblueRow?.actblue_client_uuid?.trim() ?? null}
            hasSavedSecret={hasSavedSecret}
            secretLast4={secretLast4}
            lastSyncedAt={actblueRow?.actblue_last_synced_at ?? null}
          />
        ) : null
      }
    />
  );
}
