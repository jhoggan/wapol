const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCurrency(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return currency.format(Number.isFinite(n) ? n : 0);
}

export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const d = new Date(isoDate + "T12:00:00");
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
