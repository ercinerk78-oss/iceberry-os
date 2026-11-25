export const royaltyExcludedHotelNames = [
  "Ambassador Plaza Hotel", "Andriake Beach Club", "Astoria Hotel Kemer",
  "Batıhan Beach Resort & Spa", "Çamyuva Luna Hotel", "Casa Fora Beach Resort",
  "DoubleTree by Hilton Antalya-Kemer All-Inclusive Resort", "Grand Miramor Hotel",
  "Imperial Türkiz Resort Hotel", "Miramor Garden Resort", "Nar Hotel",
  "Noxinn Deluxe Hotel", "Papillon Ayscha Hotel", "Papillon Belvil Hotel",
  "Papillon Zeugma Relaxury", "Seaphoria Beach Resort", "Selge Beach Resort & Spa",
  "Stella Hotel", "Sunland Resort Hotel Beldibi", "TUI BLUE Palm Garden",
  "TUI BLUE Sarıgerme Park",
] as const;

function normalizeName(name: string) {
  return name.normalize("NFKC").toLocaleLowerCase("tr-TR")
    .replace(/\s+şubesi\s*$/u, "").replace(/\s+/gu, " ").trim();
}

const excludedNames = new Set<string>(royaltyExcludedHotelNames.map(normalizeName));

export function isRoyaltyExcludedHotel(branch: { branchName: string; concept?: string | null; conceptType?: string | null }) {
  return excludedNames.has(normalizeName(branch.branchName)) ||
    [branch.concept, branch.conceptType].some(value => value && ["HOTEL", "OTEL", "HOTEL_KIOSK", "OTEL_KIOSK"].includes(value.trim().toLocaleUpperCase("tr-TR")));
}
