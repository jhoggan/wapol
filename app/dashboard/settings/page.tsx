import { SettingsClient } from "@/components/dashboard/settings-client";
import { SelectCommitteePrompt } from "@/components/dashboard/select-committee-prompt";
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

  return (
    <SettingsClient
      email={user.email}
      profile={profile}
      prefs={prefs}
    />
  );
}
