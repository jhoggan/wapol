"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  jurisdictionTypeLabel,
  type JurisdictionType,
  type RaceType,
} from "@/lib/campaign-labels";
import { findActiveRulesetId } from "@/lib/compliance/active-ruleset";
import {
  fetchDistrictCountyScope,
  parseDistrictNumber,
} from "@/lib/compliance/district";
import { conventionPartyKey } from "@/lib/compliance/party";
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

const PARTY_OPTIONS = [
  "Democratic Party",
  "Republican Party",
  "Unaffiliated",
] as const;

const UTAH_COUNTIES = [
  "Beaver",
  "Box Elder",
  "Cache",
  "Carbon",
  "Daggett",
  "Davis",
  "Duchesne",
  "Emery",
  "Garfield",
  "Grand",
  "Iron",
  "Juab",
  "Kane",
  "Millard",
  "Morgan",
  "Piute",
  "Rich",
  "Salt Lake",
  "San Juan",
  "Sanpete",
  "Sevier",
  "Summit",
  "Tooele",
  "Uintah",
  "Utah",
  "Wasatch",
  "Washington",
  "Wayne",
  "Weber",
] as const;

const RACE_OPTIONS_BY_LEVEL: Record<
  "state" | "county" | "municipal",
  { value: RaceType; label: string }[]
> = {
  state: [
    { value: "state_house", label: "State House" },
    { value: "state_senate", label: "State Senate" },
    { value: "state_school_board", label: "State School Board" },
    { value: "state_constitutional", label: "State Constitutional Office" },
  ],
  county: [
    { value: "county", label: "County Office" },
    { value: "county_school_board", label: "County School Board" },
  ],
  municipal: [{ value: "municipal", label: "Municipal Office" }],
};

const SPECIAL_ELECTION_TYPES = [
  { value: "primary", label: "Primary" },
  { value: "general", label: "General" },
  { value: "runoff", label: "Runoff" },
] as const;

const HOUSE_DISTRICT_OPTIONS = Array.from({ length: 75 }, (_, i) => {
  const n = i + 1;
  return `House District ${n}`;
});

const SENATE_DISTRICT_OPTIONS = Array.from({ length: 29 }, (_, i) => {
  const n = i + 1;
  return `Senate District ${n}`;
});

const STATE_SCHOOL_BOARD_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const n = i + 1;
  return `State School Board District ${n}`;
});

const CONSTITUTIONAL_OFFICES = [
  "Governor",
  "Attorney General",
  "State Auditor",
  "State Treasurer",
] as const;

const FEDERAL_OFFICE_OPTIONS = [
  "U.S. House",
  "U.S. Senate",
  "President",
] as const;

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

type CampaignLevel = "federal" | "state" | "county" | "municipal" | "";

type FormData = {
  entityType: EntityChoice | null;
  selectedState: string;
  firstName: string;
  lastName: string;
  party: string;
  campaignLevel: CampaignLevel;
  federalOffice: string;
  federalState: string;
  utahCounty: string;
  officeName: string;
  raceType: RaceType | "";
  judicialElection: boolean;
  generalElectionDate: string;
  primaryElectionDate: string;
  specialElection: boolean;
  specialElectionType: "primary" | "general" | "runoff" | "";
  specialElectionDate: string;
  identifiesLeftLeaning: boolean | null;
  currentlyHoldingOffice: boolean;
  publicFinanceProgram: boolean;
  pgApplicantFirstName: string;
  pgApplicantLastName: string;
  pgType: string;
  pgEntityFolderLink: string;
  legalName: string;
  treasurerName: string;
  useTreasurerAsSelf: boolean;
  mailingAddress: string;
  website: string;
  contactPhone: string;
  contactEmail: string;
  filingStatus: string;
  contributionLimit: string;
  pgSocialFacebook: string;
  pgSocialInstagram: string;
  conventionDate: string;
  conventionDateSource: "default" | "override" | "";
};

const initialForm: FormData = {
  entityType: null,
  selectedState: "",
  firstName: "",
  lastName: "",
  party: "",
  campaignLevel: "",
  federalOffice: "",
  federalState: "",
  utahCounty: "",
  officeName: "",
  raceType: "",
  judicialElection: false,
  generalElectionDate: "",
  primaryElectionDate: "",
  specialElection: false,
  specialElectionType: "",
  specialElectionDate: "",
  identifiesLeftLeaning: null,
  currentlyHoldingOffice: false,
  publicFinanceProgram: false,
  pgApplicantFirstName: "",
  pgApplicantLastName: "",
  pgType: "",
  pgEntityFolderLink: "",
  legalName: "",
  treasurerName: "",
  useTreasurerAsSelf: false,
  mailingAddress: "",
  website: "",
  contactPhone: "",
  contactEmail: "",
  filingStatus: "",
  contributionLimit: "",
  pgSocialFacebook: "",
  pgSocialInstagram: "",
  conventionDate: "",
  conventionDateSource: "",
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

function onboardingRaceLabel(rt: RaceType | ""): string {
  if (!rt) return "—";
  for (const level of ["state", "county", "municipal"] as const) {
    const hit = RACE_OPTIONS_BY_LEVEL[level].find((o) => o.value === rt);
    if (hit) return hit.label;
  }
  return rt;
}

function candidateFilingFromForm(d: FormData): {
  type: JurisdictionType;
  name: string | null;
} {
  const rt = d.raceType as RaceType;
  const stateRaces: RaceType[] = [
    "state_house",
    "state_senate",
    "state_school_board",
    "state_constitutional",
  ];
  if (stateRaces.includes(rt)) {
    return {
      type: "lieutenant_governor",
      name: "Utah Lieutenant Governor's Office",
    };
  }
  if (rt === "county" || rt === "county_school_board") {
    const co = d.utahCounty.trim();
    return { type: "county", name: co ? `${co} County` : null };
  }
  if (rt === "municipal") {
    const muni = d.officeName.trim();
    return {
      type: "municipal",
      name: muni ? `${muni} City Recorder` : null,
    };
  }
  return { type: "lieutenant_governor", name: null };
}

export default function NewCommitteePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [waitlistSaving, setWaitlistSaving] = useState(false);

  const update = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const raceOptions = useMemo(() => {
    const level = data.campaignLevel;
    if (!level || level === "federal") {
      return [];
    }
    return RACE_OPTIONS_BY_LEVEL[level] ?? [];
  }, [data.campaignLevel]);

  const showCampaignLevelPicker = useMemo(
    () =>
      data.entityType === "candidate" &&
      (data.party === "Democratic Party" ||
        (data.party === "Unaffiliated" && data.identifiesLeftLeaning === true)),
    [data.entityType, data.party, data.identifiesLeftLeaning]
  );

  const showUtahCandidateStepFields =
    showCampaignLevelPicker &&
    data.campaignLevel !== "" &&
    data.campaignLevel !== "federal";

  const showConventionFields = useMemo(
    () =>
      data.entityType === "candidate" &&
      data.campaignLevel === "state" &&
      (data.party === "Democratic Party" ||
        data.party === "Republican Party") &&
      (data.raceType === "state_house" || data.raceType === "state_senate"),
    [
      data.entityType,
      data.campaignLevel,
      data.party,
      data.raceType,
    ]
  );

  useEffect(() => {
    if (!showConventionFields) return;
    const supabase = createClient();
    const year = electionYearFromForm(data);
    const pk = conventionPartyKey(data.party);
    if (!pk) return;
    void (async () => {
      const { data: row } = await supabase
        .from("convention_dates")
        .select("convention_date")
        .eq("party", pk)
        .eq("state", "Utah")
        .eq("election_year", year)
        .eq("jurisdiction", "statewide")
        .maybeSingle();
      const cd = row?.convention_date as string | undefined;
      if (!cd) return;
      setData((prev) => {
        if (prev.conventionDate.trim()) return prev;
        return {
          ...prev,
          conventionDate: cd,
          conventionDateSource: "default",
        };
      });
    })();
  }, [
    showConventionFields,
    data.generalElectionDate,
    data.party,
    data.primaryElectionDate,
    data.specialElection,
    data.specialElectionDate,
  ]);

  useEffect(() => {
    if (data.entityType !== "candidate" || !data.useTreasurerAsSelf) return;
    const t = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();
    setData((prev) =>
      prev.treasurerName === t ? prev : { ...prev, treasurerName: t }
    );
  }, [
    data.entityType,
    data.useTreasurerAsSelf,
    data.firstName,
    data.lastName,
  ]);

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

        const repBlock = data.party === "Republican Party";
        const unaffNoBlock =
          data.party === "Unaffiliated" &&
          data.identifiesLeftLeaning === false;
        const fedBlock = data.campaignLevel === "federal";

        if (repBlock || unaffNoBlock) {
          if (!data.contactEmail.trim()) e.contactEmail = "Required.";
          setErrors(e);
          return Object.keys(e).length === 0;
        }

        if (fedBlock) {
          if (!data.contactEmail.trim()) e.contactEmail = "Required.";
          if (!data.federalOffice.trim()) e.federalOffice = "Select office.";
          if (!data.federalState.trim()) e.federalState = "Select state.";
          setErrors(e);
          return Object.keys(e).length === 0;
        }

        if (!data.campaignLevel) e.campaignLevel = "Select campaign level.";
        if (
          (data.campaignLevel === "county" ||
            data.campaignLevel === "municipal") &&
          !data.utahCounty.trim()
        ) {
          e.utahCounty = "Select a county.";
        }
        if (!data.raceType) e.raceType = "Select race type.";
        if (!data.officeName.trim()) e.officeName = "Required.";
        if (!data.contactPhone.trim()) e.contactPhone = "Required.";
        if (!data.contactEmail.trim()) e.contactEmail = "Required.";
        if (data.specialElection) {
          if (!data.specialElectionType) {
            e.specialElectionType = "Select special election type.";
          }
          if (!data.specialElectionDate.trim()) {
            e.specialElectionDate = "Select special election date.";
          }
        }
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
        if (!data.filingStatus.trim()) e.filingStatus = "Required.";
        if (showConventionFields) {
          if (!data.conventionDate.trim()) {
            e.conventionDate = "Convention date is required.";
          }
        }
        if (data.campaignLevel === "county" || data.campaignLevel === "municipal") {
          const lim = parseLimit(data.contributionLimit);
          if (data.contributionLimit.trim() !== "" && !Number.isFinite(lim)) {
            e.contributionLimit = "Enter a valid number or leave blank.";
          }
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
    [data, showConventionFields]
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
    if (step === 3 && data.entityType === "candidate") {
      const blocked =
        data.party === "Republican Party" ||
        (data.party === "Unaffiliated" &&
          data.identifiesLeftLeaning === false) ||
        data.campaignLevel === "federal";
      if (blocked) return;
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
    update("officeName", "");
    if (level === "federal") {
      update("utahCounty", "");
      update("federalOffice", "");
      update("federalState", "");
      return;
    }
    update("federalOffice", "");
    update("federalState", "");
    if (level !== "county" && level !== "municipal") {
      update("utahCounty", "");
    }
    if (
      level &&
      RACE_OPTIONS_BY_LEVEL[level as "state" | "county" | "municipal"]?.length ===
        1
    ) {
      update(
        "raceType",
        RACE_OPTIONS_BY_LEVEL[level as "state" | "county" | "municipal"][0]
          .value
      );
    }
  }

  async function submitCandidateWaitlist(opts: {
    entity_type: string | null;
    party: string | null;
    notes: string | null;
    state: string;
  }) {
    setSubmitError(null);
    if (!data.firstName.trim() || !data.lastName.trim()) {
      setSubmitError("First and last name are required.");
      return;
    }
    if (!data.contactEmail.trim()) {
      setSubmitError("Email is required.");
      return;
    }
    if (opts.entity_type === "federal") {
      if (!data.federalOffice.trim() || !data.federalState.trim()) {
        setSubmitError("Select federal office and state.");
        return;
      }
    }
    setWaitlistSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("waitlist").insert({
      first_name: data.firstName.trim(),
      last_name: data.lastName.trim(),
      email: data.contactEmail.trim(),
      state: opts.state,
      entity_type: opts.entity_type,
      party: opts.party,
      notes: opts.notes,
    });
    setWaitlistSaving(false);
    if (error) {
      setSubmitError(error.message);
      return;
    }
    router.push("/waitlist/confirmation");
  }

  function handleRaceType(rt: RaceType) {
    update("raceType", rt);
    update("officeName", "");
    update("conventionDate", "");
    update("conventionDateSource", "");
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
    if (data.entityType === "candidate") {
      if (
        data.campaignLevel !== "state" &&
        data.contributionLimit.trim() !== "" &&
        !Number.isFinite(limitNum)
      ) {
        setSaving(false);
        setSubmitError("Contribution limit must be a valid number or empty.");
        return;
      }
    } else if (data.contributionLimit.trim() !== "" && !Number.isFinite(limitNum)) {
      setSaving(false);
      setSubmitError("Contribution limit must be a valid number or empty.");
      return;
    }

    if (data.entityType === "candidate") {
      const year = electionYearFromForm(data);
      const filing = candidateFilingFromForm(data);
      const committeeLimit =
        data.campaignLevel === "state" ? null : limitNum;

      const districtNum = parseDistrictNumber(
        data.officeName,
        data.raceType as RaceType
      );
      let districtCountyScope: "single_county" | "multi_county" | "statewide" | null =
        null;
      if (data.campaignLevel === "state") {
        if (districtNum != null) {
          const scope = await fetchDistrictCountyScope(supabase, {
            raceType: data.raceType as string,
            districtNumber: districtNum,
          });
          districtCountyScope = scope ?? "statewide";
        } else {
          districtCountyScope = "statewide";
        }
      }

      const rulesetJurisdictionName =
        filing.type === "lieutenant_governor" ? null : filing.name || null;

      const rulesetId = await findActiveRulesetId(supabase, {
        state: "Utah",
        jurisdictionType: filing.type,
        jurisdictionName: rulesetJurisdictionName,
        electionYear: year,
      });

      const conventionOverride =
        showConventionFields && data.conventionDateSource === "override"
          ? data.conventionDate.trim() || null
          : null;
      const conventionSource = showConventionFields
        ? data.conventionDateSource === "override"
          ? "override"
          : "default"
        : null;

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
          utah_county:
            data.campaignLevel === "county" || data.campaignLevel === "municipal"
              ? data.utahCounty.trim() || null
              : null,
          judicial_election: data.judicialElection,
          general_election_date: data.generalElectionDate.trim() || null,
          primary_election_date: data.primaryElectionDate.trim() || null,
          special_election: data.specialElection,
          special_election_date: data.specialElection
            ? data.specialElectionDate.trim() || null
            : null,
          special_election_type: data.specialElection
            ? data.specialElectionType || null
            : null,
          identifies_left_leaning:
            data.party === "Unaffiliated" ? data.identifiesLeftLeaning : null,
          currently_holding_office: data.currentlyHoldingOffice,
          public_finance_program: data.publicFinanceProgram,
          committee_legal_name: data.legalName.trim(),
          website: data.website.trim() || null,
          contact_phone: data.contactPhone.trim(),
          contact_email: data.contactEmail.trim(),
          regulatory_state: "Utah",
          election_year: year,
          committee_name: data.legalName.trim(),
          convention_date_override: conventionOverride,
          convention_date_source: conventionSource,
          district_county_scope: districtCountyScope,
          district_number: districtNum,
        })
        .select("id")
        .single();

      if (cErr || !candRow) {
        setSaving(false);
        setSubmitError(cErr?.message ?? "Could not create candidate.");
        return;
      }

      const { data: comRow, error: comErr } = await supabase
        .from("committees")
        .insert({
          entity_type: "candidate",
          candidate_id: candRow.id,
          political_group_id: null,
          treasurer_name: data.treasurerName.trim(),
          mailing_address: data.mailingAddress.trim(),
          filing_jurisdiction_type: filing.type,
          filing_jurisdiction_name: filing.name,
          filing_status: data.filingStatus.trim(),
          contribution_limit: committeeLimit,
          ruleset_id: rulesetId,
        })
        .select("id")
        .single();

      if (comErr) {
        await supabase.from("candidates").delete().eq("id", candRow.id);
        setSaving(false);
        setSubmitError(comErr.message);
        return;
      }

      if (comRow?.id) {
        try {
          await fetch("/api/deadlines/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ committee_id: comRow.id }),
          });
        } catch {
          /* non-fatal */
        }
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
          href="/dashboard"
          className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          ← Back to dashboard
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
                  Political Group — PAC, political issue committee, political
                  party, labor organization, or independent expenditure committee
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
                Party Affiliation
              </label>
              <select
                id="party"
                value={data.party}
                onChange={(e) => {
                  const v = e.target.value;
                  update("party", v);
                  if (v !== "Unaffiliated") {
                    update("identifiesLeftLeaning", null);
                  }
                }}
                className={inputClass}
              >
                <option value="">Select…</option>
                {PARTY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {errors.party ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.party}</p>
              ) : null}
            </div>
            {data.party === "Republican Party" ? (
              <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-4">
                <p className="text-sm text-neutral-800 dark:text-neutral-200">
                  Wasatch Political currently works with Democratic and unaffiliated
                  candidates. We&apos;re not able to support Republican campaigns at
                  this time. Join the waitlist and we&apos;ll reach out when we can
                  help.
                </p>
                <div>
                  <label htmlFor="wl-em-rep" className={labelClass}>
                    Email
                  </label>
                  <input
                    id="wl-em-rep"
                    type="email"
                    value={data.contactEmail}
                    onChange={(e) => update("contactEmail", e.target.value)}
                    className={inputClass}
                    placeholder="you@example.com"
                  />
                  {errors.contactEmail ? (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {errors.contactEmail}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={waitlistSaving}
                  onClick={() =>
                    submitCandidateWaitlist({
                      entity_type: "candidate",
                      party: "Republican Party",
                      notes: null,
                      state: "Utah",
                    })
                  }
                  className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {waitlistSaving ? "Submitting…" : "Join waitlist"}
                </button>
              </div>
            ) : null}
            {data.party === "Unaffiliated" ? (
              <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 space-y-2">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  Do you identify as liberal, progressive, or otherwise
                  left-leaning?
                </p>
                <div className="flex rounded-lg border border-neutral-300 dark:border-neutral-600 overflow-hidden w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => update("identifiesLeftLeaning", false)}
                    className={`flex-1 sm:flex-initial px-4 py-2 text-sm font-medium transition-colors ${
                      data.identifiesLeftLeaning === false
                        ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                        : "bg-white dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => update("identifiesLeftLeaning", true)}
                    className={`flex-1 sm:flex-initial px-4 py-2 text-sm font-medium transition-colors border-l border-neutral-300 dark:border-neutral-600 ${
                      data.identifiesLeftLeaning === true
                        ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                        : "bg-white dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </div>
            ) : null}
            {data.party === "Unaffiliated" &&
            data.identifiesLeftLeaning === false ? (
              <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-4">
                <p className="text-sm text-neutral-800 dark:text-neutral-200">
                  Wasatch Political currently works with Democratic and
                  left-leaning unaffiliated candidates. We&apos;re not able to
                  support your campaign at this time. Join the waitlist and
                  we&apos;ll be in touch if that changes.
                </p>
                <div>
                  <label htmlFor="wl-em-un" className={labelClass}>
                    Email
                  </label>
                  <input
                    id="wl-em-un"
                    type="email"
                    value={data.contactEmail}
                    onChange={(e) => update("contactEmail", e.target.value)}
                    className={inputClass}
                    placeholder="you@example.com"
                  />
                  {errors.contactEmail ? (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {errors.contactEmail}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={waitlistSaving}
                  onClick={() =>
                    submitCandidateWaitlist({
                      entity_type: "candidate",
                      party: "Unaffiliated - Not Left Leaning",
                      notes: null,
                      state: "Utah",
                    })
                  }
                  className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {waitlistSaving ? "Submitting…" : "Join waitlist"}
                </button>
              </div>
            ) : null}
            {showCampaignLevelPicker ? (
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
                  <option value="federal">Federal</option>
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
            ) : null}
            {showCampaignLevelPicker && data.campaignLevel === "federal" ? (
              <div className="space-y-4 rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50/80 dark:bg-blue-950/20 p-4">
                <p className="text-sm font-medium text-blue-950 dark:text-blue-100">
                  Federal campaigns are not yet fully supported. Submit your info
                  and we&apos;ll reach out when we&apos;re ready.
                </p>
                <div>
                  <label htmlFor="fed-office" className={labelClass}>
                    Federal office
                  </label>
                  <select
                    id="fed-office"
                    value={data.federalOffice}
                    onChange={(e) => update("federalOffice", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select…</option>
                    {FEDERAL_OFFICE_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                  {errors.federalOffice ? (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {errors.federalOffice}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="fed-state" className={labelClass}>
                    State you are running in
                  </label>
                  <select
                    id="fed-state"
                    value={data.federalState}
                    onChange={(e) => update("federalState", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select…</option>
                    {US_JURISDICTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {errors.federalState ? (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {errors.federalState}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="wl-em-fed" className={labelClass}>
                    Email
                  </label>
                  <input
                    id="wl-em-fed"
                    type="email"
                    value={data.contactEmail}
                    onChange={(e) => update("contactEmail", e.target.value)}
                    className={inputClass}
                    placeholder="you@example.com"
                  />
                  {errors.contactEmail ? (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {errors.contactEmail}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={waitlistSaving}
                  onClick={() =>
                    submitCandidateWaitlist({
                      entity_type: "federal",
                      party: data.party.trim() || null,
                      notes: `${data.federalOffice.trim()} — ${data.federalState.trim()}`,
                      state: data.federalState.trim() || "Utah",
                    })
                  }
                  className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {waitlistSaving ? "Submitting…" : "Join waitlist"}
                </button>
              </div>
            ) : null}
            {showUtahCandidateStepFields &&
            (data.campaignLevel === "county" ||
              data.campaignLevel === "municipal") && (
              <div>
                <label htmlFor="utah-co" className={labelClass}>
                  Utah county
                </label>
                <select
                  id="utah-co"
                  value={data.utahCounty}
                  onChange={(e) => update("utahCounty", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select…</option>
                  {UTAH_COUNTIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {errors.utahCounty ? (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {errors.utahCounty}
                  </p>
                ) : null}
              </div>
            )}
            {showUtahCandidateStepFields ? (
              <>
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
                {raceOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {errors.raceType ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.raceType}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="office" className={labelClass}>
                Office name
              </label>
              {data.raceType === "state_house" ? (
                <select
                  id="office"
                  value={data.officeName}
                  onChange={(e) => update("officeName", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select…</option>
                  {HOUSE_DISTRICT_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : data.raceType === "state_senate" ? (
                <select
                  id="office"
                  value={data.officeName}
                  onChange={(e) => update("officeName", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select…</option>
                  {SENATE_DISTRICT_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : data.raceType === "state_school_board" ? (
                <select
                  id="office"
                  value={data.officeName}
                  onChange={(e) => update("officeName", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select…</option>
                  {STATE_SCHOOL_BOARD_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : data.raceType === "state_constitutional" ? (
                <select
                  id="office"
                  value={data.officeName}
                  onChange={(e) => update("officeName", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select…</option>
                  {CONSTITUTIONAL_OFFICES.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : data.raceType === "county" ||
                data.raceType === "county_school_board" ||
                data.raceType === "municipal" ? (
                <input
                  id="office"
                  value={data.officeName}
                  onChange={(e) => update("officeName", e.target.value)}
                  className={inputClass}
                  placeholder={
                    data.raceType === "municipal"
                      ? "Municipality name"
                      : "Office name"
                  }
                />
              ) : (
                <input
                  id="office"
                  value={data.officeName}
                  disabled
                  className={`${inputClass} opacity-60`}
                  placeholder="Select race type first"
                />
              )}
              {errors.officeName ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.officeName}</p>
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
                  Primary election date{" "}
                  <span className="font-normal text-neutral-500">(optional)</span>
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
            {data.specialElection ? (
              <div className="grid sm:grid-cols-2 gap-4 pl-0 sm:pl-2 border-l-2 border-neutral-200 dark:border-neutral-700">
                <div>
                  <label htmlFor="sp-type" className={labelClass}>
                    Special election type
                  </label>
                  <select
                    id="sp-type"
                    value={data.specialElectionType}
                    onChange={(e) =>
                      update(
                        "specialElectionType",
                        e.target.value as
                          | "primary"
                          | "general"
                          | "runoff"
                          | ""
                      )
                    }
                    className={inputClass}
                  >
                    <option value="">Select…</option>
                    {SPECIAL_ELECTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  {errors.specialElectionType ? (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {errors.specialElectionType}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="sp-date" className={labelClass}>
                    Special election date
                  </label>
                  <input
                    id="sp-date"
                    type="date"
                    value={data.specialElectionDate}
                    onChange={(e) =>
                      update("specialElectionDate", e.target.value)
                    }
                    className={inputClass}
                  />
                  {errors.specialElectionDate ? (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {errors.specialElectionDate}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
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
              </>
            ) : null}

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
                disabled={
                  data.party === "Republican Party" ||
                  (data.party === "Unaffiliated" &&
                    data.identifiesLeftLeaning === false) ||
                  data.campaignLevel === "federal"
                }
                className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
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
                disabled={data.useTreasurerAsSelf}
                onChange={(e) => {
                  update("useTreasurerAsSelf", false);
                  update("treasurerName", e.target.value);
                }}
                className={inputClass}
              />
              {errors.treasurerName ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {errors.treasurerName}
                </p>
              ) : null}
              <label className="mt-2 flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.useTreasurerAsSelf}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    update("useTreasurerAsSelf", checked);
                    if (checked) {
                      update(
                        "treasurerName",
                        `${data.firstName.trim()} ${data.lastName.trim()}`.trim()
                      );
                    }
                  }}
                  className="rounded border-neutral-300 dark:border-neutral-600"
                />
                Use my name
              </label>
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
            {showConventionFields ? (
              <div>
                <label htmlFor="conv" className={labelClass}>
                  Party convention date
                </label>
                <input
                  id="conv"
                  type="date"
                  value={data.conventionDate}
                  onChange={(e) => {
                    update("conventionDate", e.target.value);
                    update("conventionDateSource", "override");
                  }}
                  className={inputClass}
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">
                  This is your party&apos;s default convention date. Update it if
                  your county convention is on a different date.
                </p>
                {errors.conventionDate ? (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {errors.conventionDate}
                  </p>
                ) : null}
              </div>
            ) : null}
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
            {(data.campaignLevel === "county" ||
              data.campaignLevel === "municipal") && (
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
            )}
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
                  <ReviewRow label="Party Affiliation" value={data.party} />
                  {data.party === "Unaffiliated" ? (
                    <ReviewRow
                      label="Left-leaning (liberal / progressive)"
                      value={
                        data.identifiesLeftLeaning === null
                          ? "—"
                          : data.identifiesLeftLeaning
                            ? "Yes"
                            : "No"
                      }
                    />
                  ) : null}
                  <ReviewRow
                    label="Campaign level"
                    value={data.campaignLevel || "—"}
                  />
                  {(data.campaignLevel === "county" ||
                    data.campaignLevel === "municipal") &&
                  data.utahCounty ? (
                    <ReviewRow label="Utah county" value={data.utahCounty} />
                  ) : null}
                  <ReviewRow
                    label="Race type"
                    value={onboardingRaceLabel(data.raceType)}
                  />
                  <ReviewRow label="Office" value={data.officeName} />
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
                  {data.specialElection ? (
                    <>
                      <ReviewRow
                        label="Special election type"
                        value={
                          SPECIAL_ELECTION_TYPES.find(
                            (t) => t.value === data.specialElectionType
                          )?.label ?? "—"
                        }
                      />
                      <ReviewRow
                        label="Special election date"
                        value={data.specialElectionDate || "—"}
                      />
                    </>
                  ) : null}
                  <ReviewRow
                    label="Currently holding office"
                    value={data.currentlyHoldingOffice ? "Yes" : "No"}
                  />
                  <ReviewRow
                    label="Public finance program"
                    value={data.publicFinanceProgram ? "Yes" : "No"}
                  />
                  <ReviewRow label="Contact phone" value={data.contactPhone} />
                  <ReviewRow label="Contact email" value={data.contactEmail} />
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
                {data.entityType === "political_group" ? (
                  <>
                    <ReviewRow label="Contact phone" value={data.contactPhone} />
                    <ReviewRow label="Contact email" value={data.contactEmail} />
                  </>
                ) : null}
                {data.entityType === "candidate" ? (
                  <>
                    <ReviewRow
                      label="Filing jurisdiction (auto-assigned)"
                      value={`${jurisdictionTypeLabel(candidateFilingFromForm(data).type)} — ${candidateFilingFromForm(data).name ?? "—"}`}
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
                  value={
                    data.entityType === "candidate" &&
                    data.campaignLevel === "state"
                      ? "Not applicable (state)"
                      : data.contributionLimit || "—"
                  }
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
