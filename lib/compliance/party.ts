/** Map candidate.party (form) to convention_dates.party */
export function conventionPartyKey(party: string | null | undefined): string | null {
  if (!party?.trim()) return null;
  const p = party.trim();
  if (p.includes("Democratic")) return "Democratic";
  if (p.includes("Republican")) return "Republican";
  return null;
}

/** Match deadline_templates.party_affiliation (e.g. 'Unaffiliated') to candidate.party */
export function templatePartyMatches(
  templateParty: string | null,
  candidateParty: string | null | undefined
): boolean {
  if (!templateParty?.trim()) return true;
  const c = (candidateParty ?? "").trim().toLowerCase();
  const t = templateParty.trim().toLowerCase();
  if (t === "unaffiliated") {
    return c.includes("unaffiliated");
  }
  return c.includes(t);
}
