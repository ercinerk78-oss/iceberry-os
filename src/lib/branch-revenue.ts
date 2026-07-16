export const REVENUE_PERIOD_TYPES = ["DAILY", "MONTHLY"] as const;
export const REVENUE_SOURCES = ["MANUAL", "POS", "TICIMAX", "PARASUT", "IMPORT", "API"] as const;
export const REVENUE_STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "LOCKED"] as const;
export const REVENUE_CURRENCIES = ["TRY", "EUR", "USD", "IQD", "IRR"] as const;
export const FINAL_REVENUE_STATUSES = ["APPROVED", "LOCKED"] as const;

export const REVENUE_STATUS_LABELS: Record<(typeof REVENUE_STATUSES)[number], string> = {
  DRAFT: "Taslak",
  SUBMITTED: "Onay Bekliyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  LOCKED: "Kilitlendi",
};

export const REVENUE_SOURCE_LABELS: Record<(typeof REVENUE_SOURCES)[number], string> = {
  MANUAL: "Manuel",
  POS: "POS",
  TICIMAX: "Ticimax",
  PARASUT: "Paraşüt",
  IMPORT: "İçe Aktarma",
  API: "API",
};

export function monthPeriod(year: number, month: number) {
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);

  return { periodStart, periodEnd };
}

export function previousMonth(year: number, month: number) {
  const date = new Date(year, month - 2, 1);

  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function percentChange(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;

  return ((current - previous) / previous) * 100;
}

export function realizationRate(actual: number, target?: number | null) {
  if (!target) return null;

  return (actual / target) * 100;
}

export function formatMoney(value: number | null | undefined, currency = "TRY") {
  if (value == null) return "—";

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "TRY" || currency === "EUR" || currency === "USD" ? 0 : 2,
  }).format(value);
}

export function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";

  return `%${value.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;
}

export function periodLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

export function isFinalRevenueStatus(status: string) {
  return (FINAL_REVENUE_STATUSES as readonly string[]).includes(status);
}
