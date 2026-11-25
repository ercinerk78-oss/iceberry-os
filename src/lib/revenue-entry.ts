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
