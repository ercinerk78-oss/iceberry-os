export const REVENUE_MONTH_NAMES = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

export function formatRevenueEntry(value: string): string | null {
  const raw = value.replace(/\s/g, "").replace(/\./g, "");
  if (!/^\d*(,\d{0,3})?$/.test(raw)) return null;
  const [integer, decimal] = raw.split(",");
  const grouped = integer.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimal === undefined ? grouped : `${grouped || "0"},${decimal}`;
}

export function revenueEntryValue(value: string) {
  return value.replace(/\./g, "").replace(",", ".");
}

export function savedRevenueDelivery(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const amount = (value as Record<string, unknown>).deliveryRevenue;
  return typeof amount === "string" && /^\d+(\.\d{1,3})?$/.test(amount) ? amount : undefined;
}
