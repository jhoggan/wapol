"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500";

const labelClass = "text-sm font-medium block mb-1";

type Props = {
  email: string;
  profile: { first_name: string | null; last_name: string | null } | null;
  prefs: {
    filing_deadline_reminders: boolean;
    contribution_limit_alerts: boolean;
    product_updates: boolean;
  } | null;
};

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2">
      <span className="text-sm text-neutral-800 dark:text-neutral-200">
        {label}
      </span>
      <div className="flex rounded-lg border border-neutral-300 dark:border-neutral-600 overflow-hidden w-full sm:w-auto">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex-1 sm:flex-initial px-4 py-2 text-sm font-medium transition-colors ${
            !value
              ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
              : "bg-white dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400"
          }`}
        >
          Off
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex-1 sm:flex-initial px-4 py-2 text-sm font-medium transition-colors border-l border-neutral-300 dark:border-neutral-600 ${
            value
              ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
              : "bg-white dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400"
          }`}
        >
          On
        </button>
      </div>
    </div>
  );
}

export function SettingsClient({ email, profile, prefs }: Props) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [lastName, setLastName] = useState(profile?.last_name ?? "");
  const [filingRem, setFilingRem] = useState(
    prefs?.filing_deadline_reminders ?? true
  );
  const [contribAlert, setContribAlert] = useState(
    prefs?.contribution_limit_alerts ?? true
  );
  const [productUp, setProductUp] = useState(prefs?.product_updates ?? false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [prefsMsg, setPrefsMsg] = useState<string | null>(null);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [pwSending, setPwSending] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setSavingProfile(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSavingProfile(false);
      return;
    }
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
      },
      { onConflict: "id" }
    );
    setSavingProfile(false);
    setProfileMsg(error ? error.message : "Profile saved.");
    if (!error) router.refresh();
  }

  async function savePrefs(e: React.FormEvent) {
    e.preventDefault();
    setPrefsMsg(null);
    setSavingPrefs(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSavingPrefs(false);
      return;
    }
    const { error } = await supabase.from("notification_preferences").upsert(
      {
        user_id: user.id,
        filing_deadline_reminders: filingRem,
        contribution_limit_alerts: contribAlert,
        product_updates: productUp,
      },
      { onConflict: "user_id" }
    );
    setSavingPrefs(false);
    setPrefsMsg(error ? error.message : "Preferences saved.");
    if (!error) router.refresh();
  }

  async function sendPasswordReset() {
    setPwMsg(null);
    setPwSending(true);
    const supabase = createClient();
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/login/reset-password`,
    });
    setPwSending(false);
    setPwMsg(error ? error.message : "Check your email for a reset link.");
  }

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Settings
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Manage your profile and preferences.
        </p>
      </div>

      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Profile
        </h2>
        <form onSubmit={saveProfile} className="space-y-4 max-w-md">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="set-fn" className={labelClass}>
                First name
              </label>
              <input
                id="set-fn"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="set-ln" className={labelClass}>
                Last name
              </label>
              <input
                id="set-ln"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              readOnly
              value={email}
              className={`${inputClass} opacity-70 cursor-not-allowed`}
            />
            <p className="text-xs text-neutral-500 mt-1">
              Email is managed through your account provider.
            </p>
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {savingProfile ? "Saving…" : "Save profile"}
          </button>
          {profileMsg ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {profileMsg}
            </p>
          ) : null}
        </form>
        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <p className={labelClass}>Password</p>
          <button
            type="button"
            onClick={sendPasswordReset}
            disabled={pwSending}
            className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50"
          >
            {pwSending ? "Sending…" : "Send password reset email"}
          </button>
          {pwMsg ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
              {pwMsg}
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Billing
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Billing and subscription management coming soon.
        </p>
        {/* TODO: Stripe Customer Portal — open billing portal URL here (e.g. POST to /api/billing/portal-session) */}
      </section>

      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Notification preferences
        </h2>
        <form onSubmit={savePrefs} className="space-y-1 max-w-xl">
          <Toggle
            label="Email me about upcoming filing deadlines"
            value={filingRem}
            onChange={setFilingRem}
          />
          <Toggle
            label="Email me when a contribution limit is approaching"
            value={contribAlert}
            onChange={setContribAlert}
          />
          <Toggle
            label="Email me about new features and updates"
            value={productUp}
            onChange={setProductUp}
          />
          <button
            type="submit"
            disabled={savingPrefs}
            className="mt-4 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {savingPrefs ? "Saving…" : "Save preferences"}
          </button>
          {prefsMsg ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {prefsMsg}
            </p>
          ) : null}
        </form>
      </section>
    </div>
  );
}
