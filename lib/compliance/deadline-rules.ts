import { addCalendarDays } from "./denver-date";

export type RuleParseContext = {
  electionYear: number;
  conventionDate: string;
  primaryElectionDate: string | null;
  generalElectionDate: string | null;
};

export function parseFilingRule(
  rule: string | null,
  ctx: RuleParseContext
): string | null {
  if (!rule?.trim()) return null;
  const t = rule.trim();

  if (t === "day_after_convention") {
    return addCalendarDays(ctx.conventionDate, 1);
  }

  const fixed = t.match(/^fixed:(\d{4}-\d{2}-\d{2})$/);
  if (fixed) {
    return fixed[1]!;
  }

  const fixedJan = t.match(/^fixed:Jan\s+1$/i);
  if (fixedJan) {
    return `${ctx.electionYear}-01-01`;
  }

  const dbc = t.match(/^days_before_convention:(-?\d+)$/);
  if (dbc) {
    const n = Number.parseInt(dbc[1]!, 10);
    return addCalendarDays(ctx.conventionDate, n);
  }

  return null;
}

export function computeDueDate(input: {
  ruleType: string;
  fixedDate: string | null;
  daysOffset: number | null;
  referenceElectionType: string | null;
  ctx: RuleParseContext;
  /** Sorted prior templates' period_end for relative_to_period_end */
  priorPeriodEnd: string | null;
}): string | null {
  const { ruleType, fixedDate, daysOffset, referenceElectionType, ctx, priorPeriodEnd } =
    input;

  if (ruleType === "fixed_date") {
    return fixedDate;
  }

  if (ruleType === "relative_to_convention") {
    if (daysOffset === null) return null;
    return addCalendarDays(ctx.conventionDate, daysOffset);
  }

  if (ruleType === "relative_to_election") {
    const base =
      referenceElectionType === "primary"
        ? ctx.primaryElectionDate
        : referenceElectionType === "general"
          ? ctx.generalElectionDate
          : referenceElectionType === "convention"
            ? ctx.conventionDate
            : null;
    if (!base || daysOffset === null) return null;
    return addCalendarDays(base, daysOffset);
  }

  if (ruleType === "relative_to_period_end") {
    if (!priorPeriodEnd || daysOffset === null) return null;
    return addCalendarDays(priorPeriodEnd, daysOffset);
  }

  return null;
}
