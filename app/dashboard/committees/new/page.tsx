"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  defaultJurisdictionForRace,
  JURISDICTION_TYPE_OPTIONS,
  raceTypeLabel,
  type JurisdictionType,
  type RaceType,
} from "@/lib/campaign-labels";
import { createClient } from "@/lib/supabase/client";

const TOTAL_STEPS = 5;

const US_JURISDICTIONS: string[] = [
  "Alabama",
  "Alaska",
  "American Samoa",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "District of Columbia",
  "Florida",
  "Georgia",
  "Guam",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Northern Mariana Islands",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Puerto Rico",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "US Virgin Islands",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

const RACE_BY_LEVEL: Record<"state" | "county" | "municipal", RaceType[]> = {
  state: [
    "state_house",
    "state_senate",
    "state_school_board",
    "state_constitutional",
  ],
  county: ["county", "county_school_board"],
  municipal: ["municipal"],
};

const PG_GROUP_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "PAC", label: "Political Action Committee (PAC)" },
  { value: "PIC", label: "Political Issue Committee (PIC)" },
  { value: "Political Party", label: "Political Party" },
  { value: "Labor Organization", label: "Labor Organization" },
  {
    value: "Independent Expenditures",
    label: "Independent Expenditures",
  },
];

type EntityChoice = "candidate" | "political_group";

type CampaignLevel = "state" | "county" | "municipal" | "";

type FormData = {
  entityType: EntityChoice | null;
  selectedState: string;
  firstName: string;
  lastName: string;
  party: string;
  campaignLevel: CampaignLevel;
  officeName: string;
  raceType: RaceType | "";
  judicialElection: boolean;
  generalElectionDate: string;
  primaryElectionDate: string;
  specialElection: boolean;
  currentlyHoldingOffice: boolean;
  publicFinanceProgram: boolean;
  pgApplicantFirstName: string;
  pgApplicantLastName: string;
  pgType: string;
  pgEntityFolderLink: string;
  legalName: string;
  treasurerName: string;
  mailingAddress: string;
  website: string;
  contactPhone: string;
  contactEmail: string;
  filingJurisdictionType: JurisdictionType | "";
  filingJurisdictionName: string;
  filingStatus: string;
  contributionLimit: string;
  pgSocialFacebook: string;
  pgSocialInstagram: string;
};

const initialForm: FormData = {
  entityType: null,
  selectedState: "",
  firstName: "",
  lastName: "",
  party: "",
  campaignLevel: "",
  officeName: "",
  raceType: "",
  judicialElection: false,
  generalElectionDate: "",
  primaryElectionDate: "",
  specialElection: false,
  currentlyHoldingOffice: false,
  publicFinanceProgram: false,
  pgApplicantFirstName: "",
  pgApplicantLastName: "",
  pgType: "",
  pgEntityFolderLink: "",
  legalName: "",
  treasurerName: "",
  mailingAddress: "",
  website: "",
  contactPhone: "",
  contactEmail: "",
  filingJurisdictionType: "",
  filingJurisdictionName: "",
  filingStatus: "",
  contributionLimit: "",
  pgSocialFacebook: "",
  pgSocialInstagram: "",
};

const inputClass =
  "w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500";

const labelClass = "text-sm font-medium block mb-1";

function parseLimit(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : NaN;
}

function electionYearFromForm(d: FormData): number {
  if (d.generalElectionDate.trim()) {
    const y = new Date(`${d.generalElectionDate}T12:00:00`).getFullYear();
    if (Number.isFinite(y)) return y;
  }
  return new Date().getFullYear();
}

export default function NewCommitteePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const raceOptions = useMemo(() => {
    if (!data.campaignLevel) return [];
    return RACE_BY_LEVEL[data.campaignLevel] ?? [];
  }, [data.campaignLevel]);

  useEffect(() => {
    if (
      step !== 4 ||
      data.entityType !== "candidate" ||
      !data.raceType ||
      data.filingJurisdictionType
    ) {
      return;
    }
    setData((prev) => ({
      ...prev,
      filingJurisdictionType: defaultJurisdictionForRace(prev.raceType as RaceType),
    }));
  }, [step, data.entityType, data.raceType, data.filingJurisdictionType]);

  const validateStep = useCallback(
    (s: number): boolean => {
      const e: Record<string, string> = {};
      if (s === 1) {
        if (!data.entityType) e.entityType = "Choose an entity type.";
      }
      if (s === 2) {
        if (!data.selectedState.trim()) e.selectedState = "Select a state or territory.";
      }
      if (s === 3 && data.entityType === "candidate") {
        if (!data.firstName.trim()) e.firstName = "Required.";
        if (!data.lastName.trim()) e.lastName = "Required.";
        if (!data.party.trim()) e.party = "Required.";
        if (!data.campaignLevel) e.campaignLevel = "Select campaign level.";
        if (!data.officeName.trim()) e.officeName = "Required.";
        if (!data.raceType) e.raceType = "Select race type.";
      }
      if (s === 3 && data.entityType === "political_group") {
        if (!data.pgApplicantFirstName.trim()) e.pgApplicantFirstName = "Required.";
        if (!data.pgApplicantLastName.trim()) e.pgApplicantLastName = "Required.";
        if (!data.pgType.trim()) e.pgType = "Select group type.";
      }
      if (s === 4 && data.entityType === "candidate") {
        if (!data.legalName.trim()) e.legalName = "Required.";
        if (!data.treasurerName.trim()) e.treasurerName = "Required.";
        if (!data.mailingAddress.trim()) e.mailingAddress = "Required.";
        if (!data.contactPhone.trim()) e.contactPhone = "Required.";
        if (!data.contactEmail.trim()) e.contactEmail = "Required.";
        if (!data.filingJurisdictionType) e.filingJurisdictionType = "Required.";
        if (!data.filingJurisdictionName.trim()) e.filingJurisdictionName = "Required.";
        if (!data.filingStatus.trim()) e.filingStatus = "Required.";
        const lim = parseLimit(data.contributionLimit);
        if (data.contributionLimit.trim() !== "" && !Number.isFinite(lim)) {
          e.contributionLimit = "Enter a valid number or leave blank.";
        }
      }
      if (s === 4 && data.entityType === "political_group") {
        if (!data.legalName.trim()) e.legalName = "Required.";
        if (!data.mailingAddress.trim()) e.mailingAddress = "Required.";
        if (!data.contactPhone.trim()) e.contactPhone = "Required.";
        if (!data.contactEmail.trim()) e.contactEmail = "Required.";
        const lim = parseLimit(data.contributionLimit);
        if (data.contributionLimit.trim() !== "" && !Number.isFinite(lim)) {
          e.contributionLimit = "Enter a valid number or leave blank.";
        }
      }
      setErrors(e);
      return Object.keys(e).length === 0;
    },
    [data]
  );

  function goNext() {
    setSubmitError(null);
    if (step === 2) {
      if (!data.selectedState.trim()) {
        setErrors({ selectedState: "Select a state or territory." });
        return;
      }
      if (data.selectedState !== "Utah") {
        router.push(
          `/dashboard/committees/not-available?state=${encodeURIComponent(data.selectedState)}`
        );
        return;
      }
    }
    if (!validateStep(step)) return;
    setStep((x) => Math.min(TOTAL_STEPS, x + 1));
  }

  function goBack() {
    setSubmitError(null);
    setErrors({});
    setStep((x) => Math.max(1, x - 1));
  }

  function goToStep(target: number) {
    setSubmitError(null);
    setErrors({});
    setStep(target);
  }

  function handleCampaignLevel(level: CampaignLevel) {
    update("campaignLevel", level);
    update("raceType", "");
    if (level && RACE_BY_LEVEL[level]?.length === 1) {
      update("raceType", RACE_BY_LEVEL[level][0]);
    }
  }

  function handleRaceType(rt: RaceType) {
    update("raceType", rt);
    update("filingJurisdictionType", defaultJurisdictionForRace(rt));
  }

  async function handleConfirmSubmit() {
    setSubmitError(null);
    if (!validateStep(3) || !validateStep(4)) {
      setSubmitError("Some required fields are missing. Use Edit to fix them.");
      return;
    }
    if (!data.entityType) {
      setSubmitError("Entity type is missing.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setSubmitError("You must be signed in.");
      return;
    }

    const limitNum = parseLimit(data.contributionLimit);
    if (data.contributionLimit.trim() !== "" && !Number.isFinite(limitNum)) {
      setSaving(false);
      setSubmitError("Contribution limit must be a valid number or empty.");
      return;
    }

    if (data.entityType === "candidate") {
      const year = electionYearFromForm(data);
      const { data: candRow, error: cErr } = await supabase
        .from("candidates")
        .insert({
          user_id: user.id,
          first_name: data.firstName.trim(),
          last_name: data.lastName.trim(),
          name: `${data.firstName.trim()} ${data.lastName.trim()}`.trim(),
          office_sought: data.officeName.trim(),
          office_name: data.officeName.trim(),
          race_type: data.raceType as RaceType,
          party: data.party.trim(),
          campaign_level: data.campaignLevel,
          judicial_election: data.judicialElection,
          general_election_date: data.generalElectionDate.trim() || null,
          primary_election_date: data.primaryElectionDate.trim() || null,
          special_election: data.specialElection,
          currently_holding_office: data.currentlyHoldingOffice,
          public_finance_program: data.publicFinanceProgram,
          committee_legal_name: data.legalName.trim(),
          committee_mailing_address: data.mailingAddress.trim(),
          website: data.website.trim() || null,
          contact_phone: data.contactPhone.trim(),
          contact_email: data.contactEmail.trim(),
          regulatory_state: "Utah",
          election_year: year,
          committee_name: data.legalName.trim(),
        })
        .select("id")
        .single();

      if (cErr || !candRow) {
        setSaving(false);
        setSubmitError(cErr?.message ?? "Could not create candidate.");
        return;
      }

      const { error: comErr } = await supabase.from("committees").insert({
        entity_type: "candidate",
        candidate_id: candRow.id,
        political_group_id: null,
        treasurer_name: data.treasurerName.trim(),
        mailing_address: data.mailingAddress.trim(),
        filing_jurisdiction_type: data.filingJurisdictionType as JurisdictionType,
        filing_jurisdiction_name: data.filingJurisdictionName.trim(),
        filing_status: data.filingStatus.trim(),
        contribution_limit: limitNum,
      });

      if (comErr) {
        await supabase.from("candidates").delete().eq("id", candRow.id);
        setSaving(false);
        setSubmitError(comErr.message);
        return;
      }
    } else {
      const { data: pgRow, error: pgErr } = await supabase
        .from("political_groups")
        .insert({
          user_id: user.id,
          first_name: data.pgApplicantFirstName.trim(),
          last_name: data.pgApplicantLastName.trim(),
          group_type: data.pgType.trim(),
          legal_name: data.legalName.trim(),
          mailing_address: data.mailingAddress.trim(),
          regulatory_state: "Utah",
          entity_folder_link: data.pgEntityFolderLink.trim() || null,
          website: data.website.trim() || null,
          facebook: data.pgSocialFacebook.trim() || null,
          instagram: data.pgSocialInstagram.trim() || null,
          contact_phone: data.contactPhone.trim(),
          contact_email: data.contactEmail.trim(),
        })
        .select("id")
        .single();

      if (pgErr || !pgRow) {
        setSaving(false);
        setSubmitError(pgErr?.message ?? "Could not create political group.");
        return;
      }

      const { error: comErr } = await supabase.from("committees").insert({
        entity_type: "political_group",
        candidate_id: null,
        political_group_id: pgRow.id,
        treasurer_name: null,
        mailing_address: data.mailingAddress.trim(),
        filing_jurisdiction_type: "lieutenant_governor",
        filing_jurisdiction_name: null,
        filing_status: null,
        contribution_limit: limitNum,
      });

      if (comErr) {
        await supabase.from("political_groups").delete().eq("id", pgRow.id);
        setSaving(false);
        setSubmitError(comErr.message);
        return;
      }
    }

    setSaving(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-16">
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
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
          Step {step} of {TOTAL_STEPS}
        </p>
        <div className="flex gap-1.5 mt-4" aria-hidden>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                step > i
                  ? "bg-neutral-900 dark:bg-neutral-100"
                  : "bg-neutral-200 dark:bg-neutral-700"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 sm:p-8 shadow-sm space-y-6">
        {submitError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {submitError}
          </p>
        ) : null}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
              What are you setting up?
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  update("entityType", "candidate");
                  setErrors({});
                }}
                className={`text-left rounded-xl border p-4 transition-all ${
                  data.entityType === "candidate"
                    ? "border-neutral-900 dark:border-neutral-100 ring-2 ring-neutral-900 dark:ring-neutral-100"
                    : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500"
                }`}
              >
                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                  Candidate Committee
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  Running for office? Set up your candidate committee
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  update("entityType", "political_group");
                  setErrors({});
                }}
                className={`text-left rounded-xl border p-4 transition-all ${
                  data.entityType === "political_group"
                    ? "border-neutral-900 dark:border-neutral-100 ring-2 ring-neutral-900 dark:ring-neutral-100"
                    : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500"
                }`}
              >
                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                  Political Group
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  Utah PAC, PIC, party, labor org, or independent expenditures
                </p>
              </button>
              <div className="relative rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/50 p-4 opacity-60 cursor-not-allowed">
                <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wide bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded">
                  Coming soon
                </span>
                <p className="font-medium text-neutral-700 dark:text-neutral-300">
                  501(c)(4)
                </p>
                <p className="text-sm text-neutral-500 mt-1">Not available yet</p>
              </div>
              <div className="relative rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/50 p-4 opacity-60 cursor-not-allowed">
                <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wide bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded">
                  Coming soon
                </span>
                <p className="font-medium text-neutral-700 dark:text-neutral-300">
                  501(c)(3)
                </p>
                <p className="text-sm text-neutral-500 mt-1">Not available yet</p>
              </div>
            </div>
            {errors.entityType ? (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.entityType}</p>
            ) : null}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={goNext}
                className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-5 py-2.5 text-sm font-medium hover:opacity-90"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
              Jurisdiction
            </h2>
            <div>
              <label htmlFor="reg-state" className={labelClass}>
                What state or territory is your committee registered in?
              </label>
              <select
                id="reg-state"
                value={data.selectedState}
                onChange={(e) => update("selectedState", e.target.value)}
                className={inputClass}
              >
                <option value="">Select…</option>
                {US_JURISDICTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {errors.selectedState ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {errors.selectedState}
                </p>
              ) : null}
            </div>
            <div className="flex justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={goBack}
                className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-5 py-2.5 text-sm font-medium"
              >
                Back
              </button>
              <button
                type="button"
                onClick={goNext}
                className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-5 py-2.5 text-sm font-medium hover:opacity-90"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && data.entityType === "candidate" && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
              Candidate details
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="fn" className={labelClass}>
                  First name
                </label>
                <input
                  id="fn"
                  value={data.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  className={inputClass}
                />
                {errors.firstName ? (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.firstName}</p>
                ) : null}
              </div>
              <div>
                <label htmlFor="ln" className={labelClass}>
                  Last name
                </label>
                <input
                  id="ln"
                  value={data.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  className={inputClass}
                />
                {errors.lastName ? (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.lastName}</p>
                ) : null}
              </div>
            </div>
            <div>
              <label htmlFor="party" className={labelClass}>
                Party affiliation / platform
              </label>
              <input
                id="party"
                value={data.party}
                onChange={(e) => update("party", e.target.value)}
                className={inputClass}
              />
              {errors.party ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.party}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="clevel" className={labelClass}>
                Campaign level
              </label>
              <select
                id="clevel"
                value={data.campaignLevel}
                onChange={(e) =>
                  handleCampaignLevel(e.target.value as CampaignLevel)
                }
                className={inputClass}
              >
                <option value="">Select…</option>
                <option value="state">State</option>
                <option value="county">County</option>
                <option value="municipal">Municipal</option>
              </select>
              {errors.campaignLevel ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {errors.campaignLevel}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="office" className={labelClass}>
                Office name
              </label>
              <input
                id="office"
                value={data.officeName}
                onChange={(e) => update("officeName", e.target.value)}
                className={inputClass}
              />
              {errors.officeName ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.officeName}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="rtype" className={labelClass}>
                Race type
              </label>
              <select
                id="rtype"
                value={data.raceType}
                onChange={(e) =>
                  handleRaceType(e.target.value as RaceType)
                }
                disabled={raceOptions.length === 0}
                className={inputClass}
              >
                <option value="">
                  {raceOptions.length ? "Select…" : "Choose campaign level first"}
                </option>
                {raceOptions.map((v) => (
                  <option key={v} value={v}>
                    {raceTypeLabel(v)}
                  </option>
                ))}
              </select>
              {errors.raceType ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.raceType}</p>
              ) : null}
            </div>

            <ToggleRow
              label="Judicial election"
              value={data.judicialElection}
              onChange={(v) => update("judicialElection", v)}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ged" className={labelClass}>
                  General election date
                </label>
                <input
                  id="ged"
                  type="date"
                  value={data.generalElectionDate}
                  onChange={(e) => update("generalElectionDate", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="ped" className={labelClass}>
                  Primary election date
                </label>
                <input
                  id="ped"
                  type="date"
                  value={data.primaryElectionDate}
                  onChange={(e) => update("primaryElectionDate", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <ToggleRow
              label="Special election"
              value={data.specialElection}
              onChange={(v) => update("specialElection", v)}
            />
            <ToggleRow
              label="Currently holding office"
              value={data.currentlyHoldingOffice}
              onChange={(v) => update("currentlyHoldingOffice", v)}
            />
            <ToggleRow
              label="Participating in public finance program"
              value={data.publicFinanceProgram}
              onChange={(v) => update("publicFinanceProgram", v)}
            />

            <div className="flex justify-between gap-3 pt-4">
              <button
                type="button"
                onClick={goBack}
                className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-5 py-2.5 text-sm font-medium"
              >
                Back
              </button>
              <button
                type="button"
                onClick={goNext}
                className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-5 py-2.5 text-sm font-medium hover:opacity-90"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && data.entityType === "political_group" && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
              Political organization
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="paf" className={labelClass}>
                  Applicant first name
                </label>
                <input
                  id="paf"
                  value={data.pgApplicantFirstName}
                  onChange={(e) => update("pgApplicantFirstName", e.target.value)}
                  className={inputClass}
                />
                {errors.pgApplicantFirstName ? (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {errors.pgApplicantFirstName}
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor="pal" className={labelClass}>
                  Applicant last name
                </label>
                <input
                  id="pal"
                  value={data.pgApplicantLastName}
                  onChange={(e) => update("pgApplicantLastName", e.target.value)}
                  className={inputClass}
                />
                {errors.pgApplicantLastName ? (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {errors.pgApplicantLastName}
                  </p>
                ) : null}
              </div>
            </div>
            <div>
              <label htmlFor="gtype" className={labelClass}>
                Group type
              </label>
              <select
                id="gtype"
                value={data.pgType}
                onChange={(e) => update("pgType", e.target.value)}
                className={inputClass}
              >
                <option value="">Select…</option>
                {PG_GROUP_TYPE_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
              {errors.pgType ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.pgType}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="pg-folder" className={labelClass}>
                Link to your Entity folder{" "}
                <span className="font-normal text-neutral-500">(optional)</span>
              </label>
              <input
                id="pg-folder"
                type="text"
                inputMode="url"
                value={data.pgEntityFolderLink}
                onChange={(e) => update("pgEntityFolderLink", e.target.value)}
                className={inputClass}
                placeholder="https://…"
              />
            </div>
            <div className="flex justify-between gap-3 pt-4">
              <button
                type="button"
                onClick={goBack}
                className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-5 py-2.5 text-sm font-medium"
              >
                Back
              </button>
              <button
                type="button"
                onClick={goNext}
                className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-5 py-2.5 text-sm font-medium hover:opacity-90"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 4 && data.entityType === "candidate" && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
              Committee details
            </h2>
            <div>
              <label htmlFor="clegal" className={labelClass}>
                Committee legal name
              </label>
              <input
                id="clegal"
                value={data.legalName}
                onChange={(e) => update("legalName", e.target.value)}
                className={inputClass}
              />
              {errors.legalName ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.legalName}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="tres" className={labelClass}>
                Treasurer name
              </label>
              <input
                id="tres"
                value={data.treasurerName}
                onChange={(e) => update("treasurerName", e.target.value)}
                className={inputClass}
              />
              {errors.treasurerName ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {errors.treasurerName}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="mail" className={labelClass}>
                Mailing address
              </label>
              <textarea
                id="mail"
                rows={3}
                value={data.mailingAddress}
                onChange={(e) => update("mailingAddress", e.target.value)}
                className={inputClass}
              />
              {errors.mailingAddress ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {errors.mailingAddress}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="web" className={labelClass}>
                Website{" "}
                <span className="font-normal text-neutral-500">(optional)</span>
              </label>
              <input
                id="web"
                type="url"
                value={data.website}
                onChange={(e) => update("website", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="phone" className={labelClass}>
                Contact phone
              </label>
              <input
                id="phone"
                type="tel"
                value={data.contactPhone}
                onChange={(e) => update("contactPhone", e.target.value)}
                className={inputClass}
              />
              {errors.contactPhone ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {errors.contactPhone}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="em" className={labelClass}>
                Contact email
              </label>
              <input
                id="em"
                type="email"
                value={data.contactEmail}
                onChange={(e) => update("contactEmail", e.target.value)}
                className={inputClass}
              />
              {errors.contactEmail ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {errors.contactEmail}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="fjtype" className={labelClass}>
                Filing jurisdiction type
              </label>
              <select
                id="fjtype"
                value={data.filingJurisdictionType}
                onChange={(e) =>
                  update("filingJurisdictionType", e.target.value as JurisdictionType)
                }
                className={inputClass}
              >
                <option value="">Select…</option>
                {JURISDICTION_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {errors.filingJurisdictionType ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {errors.filingJurisdictionType}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="fjname" className={labelClass}>
                Filing jurisdiction name
              </label>
              <input
                id="fjname"
                value={data.filingJurisdictionName}
                onChange={(e) => update("filingJurisdictionName", e.target.value)}
                className={inputClass}
              />
              {errors.filingJurisdictionName ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {errors.filingJurisdictionName}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="fstat" className={labelClass}>
                Filing status
              </label>
              <input
                id="fstat"
                value={data.filingStatus}
                onChange={(e) => update("filingStatus", e.target.value)}
                className={inputClass}
              />
              {errors.filingStatus ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {errors.filingStatus}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="clim" className={labelClass}>
                Contribution limit{" "}
                <span className="font-normal text-neutral-500">(optional)</span>
              </label>
              <input
                id="clim"
                type="number"
                step="0.01"
                min="0"
                value={data.contributionLimit}
                onChange={(e) => update("contributionLimit", e.target.value)}
                className={inputClass}
              />
              {errors.contributionLimit ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {errors.contributionLimit}
                </p>
              ) : null}
            </div>
            <div className="flex justify-between gap-3 pt-4">
              <button
                type="button"
                onClick={goBack}
                className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-5 py-2.5 text-sm font-medium"
              >
                Back
              </button>
              <button
                type="button"
                onClick={goNext}
                className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-5 py-2.5 text-sm font-medium hover:opacity-90"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 4 && data.entityType === "political_group" && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
              Organization details
            </h2>
            <div>
              <label htmlFor="plegal" className={labelClass}>
                Legal name of group
              </label>
              <input
                id="plegal"
                value={data.legalName}
                onChange={(e) => update("legalName", e.target.value)}
                className={inputClass}
              />
              {errors.legalName ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.legalName}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="pmail" className={labelClass}>
                Mailing address
              </label>
              <textarea
                id="pmail"
                rows={3}
                value={data.mailingAddress}
                onChange={(e) => update("mailingAddress", e.target.value)}
                className={inputClass}
              />
              {errors.mailingAddress ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {errors.mailingAddress}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="pweb" className={labelClass}>
                Website{" "}
                <span className="font-normal text-neutral-500">(optional)</span>
              </label>
              <input
                id="pweb"
                type="url"
                value={data.website}
                onChange={(e) => update("website", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="fb" className={labelClass}>
                  Facebook{" "}
                  <span className="font-normal text-neutral-500">(optional)</span>
                </label>
                <input
                  id="fb"
                  value={data.pgSocialFacebook}
                  onChange={(e) => update("pgSocialFacebook", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="ig" className={labelClass}>
                  Instagram{" "}
                  <span className="font-normal text-neutral-500">(optional)</span>
                </label>
                <input
                  id="ig"
                  value={data.pgSocialInstagram}
                  onChange={(e) => update("pgSocialInstagram", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="pphone" className={labelClass}>
                Contact phone
              </label>
              <input
                id="pphone"
                type="tel"
                value={data.contactPhone}
                onChange={(e) => update("contactPhone", e.target.value)}
                className={inputClass}
              />
              {errors.contactPhone ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {errors.contactPhone}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="pem" className={labelClass}>
                Contact email
              </label>
              <input
                id="pem"
                type="email"
                value={data.contactEmail}
                onChange={(e) => update("contactEmail", e.target.value)}
                className={inputClass}
              />
              {errors.contactEmail ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {errors.contactEmail}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="pclim" className={labelClass}>
                Contribution limit{" "}
                <span className="font-normal text-neutral-500">(optional)</span>
              </label>
              <input
                id="pclim"
                type="number"
                step="0.01"
                min="0"
                value={data.contributionLimit}
                onChange={(e) => update("contributionLimit", e.target.value)}
                className={inputClass}
              />
              {errors.contributionLimit ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {errors.contributionLimit}
                </p>
              ) : null}
            </div>
            <div className="flex justify-between gap-3 pt-4">
              <button
                type="button"
                onClick={goBack}
                className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-5 py-2.5 text-sm font-medium"
              >
                Back
              </button>
              <button
                type="button"
                onClick={goNext}
                className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-5 py-2.5 text-sm font-medium hover:opacity-90"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 5 && data.entityType && (
          <div className="space-y-8">
            <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
              Review and confirm
            </h2>

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  Entity type
                </h3>
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:underline"
                >
                  Edit
                </button>
              </div>
              <dl className="text-sm space-y-1 text-neutral-600 dark:text-neutral-300">
                <div className="flex gap-2">
                  <dt className="text-neutral-500 shrink-0">Type</dt>
                  <dd>
                    {data.entityType === "candidate"
                      ? "Candidate Committee"
                      : "Political Group"}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-neutral-500 shrink-0">Registered in</dt>
                  <dd>{data.selectedState || "—"}</dd>
                </div>
              </dl>
            </section>

            <section className="space-y-2 border-t border-neutral-200 dark:border-neutral-800 pt-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  {data.entityType === "candidate"
                    ? "Candidate details"
                    : "Group details"}
                </h3>
                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:underline"
                >
                  Edit
                </button>
              </div>
              {data.entityType === "candidate" ? (
                <dl className="text-sm space-y-1 text-neutral-600 dark:text-neutral-300">
                  <ReviewRow label="Name" value={`${data.firstName} ${data.lastName}`} />
                  <ReviewRow label="Party / platform" value={data.party} />
                  <ReviewRow
                    label="Campaign level"
                    value={data.campaignLevel || "—"}
                  />
                  <ReviewRow label="Office" value={data.officeName} />
                  <ReviewRow
                    label="Race type"
                    value={data.raceType ? raceTypeLabel(data.raceType) : "—"}
                  />
                  <ReviewRow
                    label="Judicial election"
                    value={data.judicialElection ? "Yes" : "No"}
                  />
                  <ReviewRow
                    label="General election"
                    value={data.generalElectionDate || "—"}
                  />
                  <ReviewRow
                    label="Primary election"
                    value={data.primaryElectionDate || "—"}
                  />
                  <ReviewRow
                    label="Special election"
                    value={data.specialElection ? "Yes" : "No"}
                  />
                  <ReviewRow
                    label="Currently holding office"
                    value={data.currentlyHoldingOffice ? "Yes" : "No"}
                  />
                  <ReviewRow
                    label="Public finance program"
                    value={data.publicFinanceProgram ? "Yes" : "No"}
                  />
                </dl>
              ) : (
                <dl className="text-sm space-y-1 text-neutral-600 dark:text-neutral-300">
                  <ReviewRow
                    label="Applicant"
                    value={`${data.pgApplicantFirstName} ${data.pgApplicantLastName}`}
                  />
                  <ReviewRow
                    label="Group type"
                    value={
                      PG_GROUP_TYPE_OPTIONS.find((o) => o.value === data.pgType)
                        ?.label ?? data.pgType
                    }
                  />
                  <ReviewRow
                    label="Entity folder link"
                    value={data.pgEntityFolderLink || "—"}
                  />
                </dl>
              )}
            </section>

            <section className="space-y-2 border-t border-neutral-200 dark:border-neutral-800 pt-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  Committee / organization
                </h3>
                <button
                  type="button"
                  onClick={() => goToStep(4)}
                  className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:underline"
                >
                  Edit
                </button>
              </div>
              <dl className="text-sm space-y-1 text-neutral-600 dark:text-neutral-300">
                <ReviewRow label="Legal name" value={data.legalName} />
                {data.entityType === "candidate" ? (
                  <ReviewRow label="Treasurer" value={data.treasurerName} />
                ) : null}
                <ReviewRow label="Mailing address" value={data.mailingAddress} />
                <ReviewRow label="Website" value={data.website || "—"} />
                {data.entityType === "political_group" ? (
                  <>
                    <ReviewRow
                      label="Facebook"
                      value={data.pgSocialFacebook || "—"}
                    />
                    <ReviewRow
                      label="Instagram"
                      value={data.pgSocialInstagram || "—"}
                    />
                  </>
                ) : null}
                <ReviewRow label="Contact phone" value={data.contactPhone} />
                <ReviewRow label="Contact email" value={data.contactEmail} />
                {data.entityType === "candidate" ? (
                  <>
                    <ReviewRow
                      label="Filing jurisdiction type"
                      value={
                        JURISDICTION_TYPE_OPTIONS.find(
                          (o) => o.value === data.filingJurisdictionType
                        )?.label ?? "—"
                      }
                    />
                    <ReviewRow
                      label="Filing jurisdiction name"
                      value={data.filingJurisdictionName}
                    />
                    <ReviewRow label="Filing status" value={data.filingStatus} />
                  </>
                ) : (
                  <ReviewRow
                    label="Filing jurisdiction"
                    value="Lieutenant Governor (Utah)"
                  />
                )}
                <ReviewRow
                  label="Contribution limit"
                  value={data.contributionLimit || "—"}
                />
              </dl>
            </section>

            <div className="flex justify-between gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={goBack}
                className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-5 py-2.5 text-sm font-medium"
              >
                Back
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmSubmit}
                className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-5 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Saving…" : "Confirm and create"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-1">
      <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
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
          No
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
          Yes
        </button>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 flex-col sm:flex-row sm:gap-4">
      <dt className="text-neutral-500 shrink-0 sm:w-40">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}
