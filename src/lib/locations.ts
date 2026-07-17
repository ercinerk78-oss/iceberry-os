import type { ConceptSuitability, LocationDocumentType, LocationStatus, LocationType, MatchStatus, SourceType } from "@prisma/client";

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  SHOPPING_MALL: "AVM",
  STREET_STORE: "Cadde Mağazası",
  UNIVERSITY: "Üniversite",
  HOTEL: "Otel",
  FOOD_COURT: "Food Court",
  KIOSK: "Kiosk",
  CORNER: "Corner",
  CAFE: "Cafe",
  MIXED_USE: "Karma Proje",
  OTHER: "Diğer",
};

export const LOCATION_STATUS_LABELS: Record<LocationStatus, string> = {
  NEW_OPPORTUNITY: "Yeni Fırsat",
  UNDER_REVIEW: "İnceleniyor",
  REPORT_READY: "Rapor Hazır",
  WAITING_FOR_INVESTOR: "Yatırımcı Bekliyor",
  IN_NEGOTIATION: "Görüşme Aşamasında",
  OFFER_SUBMITTED: "Teklif Verildi",
  LEASING_PROCESS: "Kiralama Aşamasında",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  PASSIVE: "Pasif",
  LEASED: "Kiralandı",
  TRANSFERRED: "Devir Alındı",
};

export const CONCEPT_SUITABILITY_LABELS: Record<ConceptSuitability, string> = {
  CORNER: "Corner",
  SELF_CAFE: "Self Cafe",
  CAFE: "Cafe",
  KIOSK: "Kiosk",
  PREMIUM_CAFE: "Premium Cafe",
  HOTEL_KIOSK: "Otel Kiosk",
  MULTIPLE: "Birden Fazla Konsepte Uygun",
  NOT_EVALUATED: "Henüz Değerlendirilmedi",
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  INTERNAL: "İç Kaynak",
  REAL_ESTATE_AGENT: "Emlak Danışmanı",
  MALL_MANAGEMENT: "AVM Yönetimi",
  FRANCHISEE: "Şube",
  ADVERTISEMENT: "İlan",
  TRANSFER_OPPORTUNITY: "Devir Fırsatı",
  OTHER: "Diğer",
};

export const LOCATION_DOCUMENT_TYPE_LABELS: Record<LocationDocumentType, string> = {
  LOCATION_ANALYSIS_PDF: "Lokasyon Analizi PDF",
  LOCATION_ANALYSIS_JPEG: "Lokasyon Analizi Görseli",
  LOCATION_PHOTO: "Lokasyon Fotoğrafı",
  RENT_OFFER: "Kira Teklifi",
  TRANSFER_OFFER: "Devir Teklifi",
  ARCHITECTURAL_PLAN: "Mimari Plan",
  CONTRACT_DRAFT: "Sözleşme Taslağı",
  MALL_PRESENTATION: "AVM Sunumu",
  TITLE_DEED: "Tapu",
  OTHER: "Diğer",
};

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  SUGGESTED: "Önerildi",
  SENT_TO_LEAD: "Adaya Gönderildi",
  INTERESTED: "İlgileniyor",
  WILL_REVIEW: "İnceleyecek",
  VISIT_PLANNED: "Ziyaret Planlandı",
  REQUESTED_OFFER: "Teklif İstedi",
  SUITABLE_FOR_INVESTMENT: "Yatırıma Uygun",
  REJECTED_BY_LEAD: "Aday Reddetti",
  CLOSED: "Kapandı",
};

export const reportDocumentTypes: LocationDocumentType[] = ["LOCATION_ANALYSIS_PDF", "LOCATION_ANALYSIS_JPEG"];

export function locationTypeLabel(value: string) {
  return LOCATION_TYPE_LABELS[value as LocationType] ?? value;
}

export function locationStatusLabel(value: string) {
  return LOCATION_STATUS_LABELS[value as LocationStatus] ?? value;
}

export function conceptSuitabilityLabel(value: string) {
  return CONCEPT_SUITABILITY_LABELS[value as ConceptSuitability] ?? value;
}

export function sourceTypeLabel(value: string) {
  return SOURCE_TYPE_LABELS[value as SourceType] ?? value;
}

export function locationDocumentTypeLabel(value: string) {
  return LOCATION_DOCUMENT_TYPE_LABELS[value as LocationDocumentType] ?? value;
}

export function matchStatusLabel(value: string) {
  return MATCH_STATUS_LABELS[value as MatchStatus] ?? value;
}

export function money(value: unknown) {
  if (value === null || value === undefined || value === "") return "Belirtilmedi";
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return "Belirtilmedi";

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(number);
}

export function numberTR(value: unknown, suffix = "") {
  if (value === null || value === undefined || value === "") return "Belirtilmedi";
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return "Belirtilmedi";

  return `${number.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}${suffix}`;
}

export function dateTR(value: Date | string | null | undefined) {
  if (!value) return "Belirtilmedi";

  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value));
}

export function hasReport(documents: { documentType: string; archivedAt?: Date | string | null }[]) {
  return documents.some((document) => !document.archivedAt && reportDocumentTypes.includes(document.documentType as LocationDocumentType));
}
