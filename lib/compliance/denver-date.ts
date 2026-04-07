/** Calendar date (YYYY-MM-DD) in America/Denver for scheduled compliance jobs. */
export function denverDateString(d = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Denver" });
}

export function parseIsoDate(s: string): Date {
  const [y, m, d] = s.split("-").map((x) => Number.parseInt(x, 10));
  return new Date(Date.UTC(y, m - 1, d));
}

export function addCalendarDays(isoDate: string, delta: number): string {
  const dt = parseIsoDate(isoDate);
  dt.setUTCDate(dt.getUTCDate() + delta);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = parseIsoDate(fromIso).getTime();
  const b = parseIsoDate(toIso).getTime();
  return Math.floor((b - a) / 86_400_000);
}
