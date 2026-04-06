"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  defaultJurisdictionForRace,
  JURISDICTION_TYPE_OPTIONS,
  RACE_TYPE_OPTIONS,
  type JurisdictionType,
  type RaceType,
} from "@/lib/campaign-labels";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500";

export function CommitteeOnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [officeSought, setOfficeSought] = useState("");
  const [raceType, setRaceType] = useState<RaceType>("state_house");
  const [party, setParty] = useState("");
  const [electionYear, setElectionYear] = useState(
    String(new Date().getFullYear())
  );

  const [treasurerName, setTreasurerName] = useState("");
  const [mailingAddress, setMailingAddress] = useState("");
  const [filingJurisdictionType, setFilingJurisdictionType] =
    useState<JurisdictionType>(() => defaultJurisdictionForRace("state_house"));
  const [filingJurisdictionName, setFilingJurisdictionName] = useState("");
  const [filingStatus, setFilingStatus] = useState("");
  const [contributionLimit, setContributionLimit] = useState("");

  function handleRaceChange(value: RaceType) {
    setRaceType(value);
    setFilingJurisdictionType(defaultJurisdictionForRace(value));
  }

  function goToStep2() {
    setError(null);
    if (!name.trim() || !officeSought.trim()) {
      setError("Name and office sought are required.");
      return;
    }
    const year = Number.parseInt(electionYear, 10);
    if (!Number.isFinite(year) || year < 1900 || year > 2100) {
      setError("Enter a valid election year.");
      return;
    }
    setFilingJurisdictionType(defaultJurisdictionForRace(raceType));
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setError("You must be signed in.");
      return;
    }

    const year = Number.parseInt(electionYear, 10);

    const { data: candidateRow, error: cErr } = await supabase
      .from("candidates")
      .insert({
        user_id: user.id,
        name: name.trim(),
        office_sought: officeSought.trim(),
        race_type: raceType,
        party: party.trim() || null,
        election_year: year,
      })
      .select("id")
      .single();

    if (cErr || !candidateRow) {
      setSaving(false);
      setError(cErr?.message ?? "Could not create candidate.");
      return;
    }

    const limitRaw = contributionLimit.trim();
    const limitNum = limitRaw === "" ? null : Number.parseFloat(limitRaw);
    if (limitRaw !== "" && !Number.isFinite(limitNum)) {
      await supabase.from("candidates").delete().eq("id", candidateRow.id);
      setSaving(false);
      setError("Contribution limit must be a valid number or empty.");
      return;
    }

    const { error: comErr } = await supabase.from("committees").insert({
      candidate_id: candidateRow.id,
      treasurer_name: treasurerName.trim(),
      mailing_address: mailingAddress.trim(),
      filing_jurisdiction_type: filingJurisdictionType,
      filing_jurisdiction_name: filingJurisdictionName.trim(),
      filing_status: filingStatus.trim(),
      contribution_limit: limitNum,
    });

    if (comErr) {
      await supabase.from("candidates").delete().eq("id", candidateRow.id);
      setSaving(false);
      setError(comErr.message);
      return;
    }

    setSaving(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <Link
          href="/dashboard/committees"
          className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          ← Back to committees
        </Link>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mt-4">
          New committee
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Step {step} of 2 — register a candidate and their principal committee.
        </p>
        <div className="flex gap-2 mt-4">
          <div
            className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-neutral-900 dark:bg-neutral-100" : "bg-neutral-200 dark:bg-neutral-700"}`}
          />
          <div
            className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-neutral-900 dark:bg-neutral-100" : "bg-neutral-200 dark:bg-neutral-700"}`}
          />
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm space-y-5">
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        {step === 1 ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              goToStep2();
            }}
            className="space-y-5"
          >
            <div>
              <label htmlFor="c-name" className="text-sm font-medium block mb-1">
                Candidate name
              </label>
              <input
                id="c-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="c-office" className="text-sm font-medium block mb-1">
                Office sought
              </label>
              <input
                id="c-office"
                required
                value={officeSought}
                onChange={(e) => setOfficeSought(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="c-race" className="text-sm font-medium block mb-1">
                Race type
              </label>
              <select
                id="c-race"
                required
                value={raceType}
                onChange={(e) =>
                  handleRaceChange(e.target.value as RaceType)
                }
                className={inputClass}
              >
                {RACE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="c-party" className="text-sm font-medium block mb-1">
                Party
              </label>
              <input
                id="c-party"
                value={party}
                onChange={(e) => setParty(e.target.value)}
                className={inputClass}
                placeholder="Optional"
              />
            </div>
            <div>
              <label htmlFor="c-year" className="text-sm font-medium block mb-1">
                Election year
              </label>
              <input
                id="c-year"
                required
                type="number"
                min={1900}
                max={2100}
                value={electionYear}
                onChange={(e) => setElectionYear(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-5 py-2.5 text-sm font-medium hover:opacity-90"
              >
                Continue
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="t-name" className="text-sm font-medium block mb-1">
                Treasurer name
              </label>
              <input
                id="t-name"
                required
                value={treasurerName}
                onChange={(e) => setTreasurerName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="mail" className="text-sm font-medium block mb-1">
                Mailing address
              </label>
              <textarea
                id="mail"
                required
                rows={3}
                value={mailingAddress}
                onChange={(e) => setMailingAddress(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="fj-type" className="text-sm font-medium block mb-1">
                Filing jurisdiction type
              </label>
              <select
                id="fj-type"
                required
                value={filingJurisdictionType}
                onChange={(e) =>
                  setFilingJurisdictionType(e.target.value as JurisdictionType)
                }
                className={inputClass}
              >
                {JURISDICTION_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-neutral-500 mt-1">
                Defaults from race type; adjust if your filing office differs.
              </p>
            </div>
            <div>
              <label htmlFor="fj-name" className="text-sm font-medium block mb-1">
                Filing jurisdiction name
              </label>
              <input
                id="fj-name"
                required
                value={filingJurisdictionName}
                onChange={(e) => setFilingJurisdictionName(e.target.value)}
                placeholder='e.g. "Weber County" or "Ogden City"'
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="f-status" className="text-sm font-medium block mb-1">
                Filing status
              </label>
              <input
                id="f-status"
                required
                value={filingStatus}
                onChange={(e) => setFilingStatus(e.target.value)}
                placeholder="e.g. active, pending"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="c-limit" className="text-sm font-medium block mb-1">
                Contribution limit
              </label>
              <input
                id="c-limit"
                type="number"
                step="0.01"
                min="0"
                value={contributionLimit}
                onChange={(e) => setContributionLimit(e.target.value)}
                placeholder="Optional — leave blank if none"
                className={inputClass}
              />
            </div>
            <div className="flex justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep(1);
                }}
                className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-5 py-2.5 text-sm font-medium"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-5 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Saving…" : "Create committee"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
