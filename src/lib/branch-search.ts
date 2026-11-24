export function normalizeBranchSearch(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").toLowerCase().trim();
}
