export const AUDIT_TYPES = [
  "REMOTE_AUDIT",
  "FIELD_AUDIT",
  "MYSTERY_SHOPPER",
  "OPENING_AUDIT",
  "FOLLOW_UP_AUDIT",
  "FOOD_SAFETY_AUDIT",
  "BRAND_STANDARD_AUDIT",
  "OPERATIONAL_AUDIT",
  "FINANCIAL_COMPLIANCE_AUDIT",
  "SUPPLY_COMPLIANCE_AUDIT",
  "EQUIPMENT_AUDIT",
  "DOCUMENT_AUDIT",
  "CUSTOM",
] as const;

export const AUDIT_TYPE_LABELS: Record<(typeof AUDIT_TYPES)[number], string> = {
  REMOTE_AUDIT: "Uzaktan Denetim",
  FIELD_AUDIT: "Saha Denetimi",
  MYSTERY_SHOPPER: "Gizli Müşteri Denetimi",
  OPENING_AUDIT: "Açılış Denetimi",
  FOLLOW_UP_AUDIT: "Takip Denetimi",
  FOOD_SAFETY_AUDIT: "Gıda Güvenliği Denetimi",
  BRAND_STANDARD_AUDIT: "Marka Standartları Denetimi",
  OPERATIONAL_AUDIT: "Operasyon Denetimi",
  FINANCIAL_COMPLIANCE_AUDIT: "Finansal Uyum Denetimi",
  SUPPLY_COMPLIANCE_AUDIT: "Merkez Tedarik Uyum Denetimi",
  EQUIPMENT_AUDIT: "Ekipman Denetimi",
  DOCUMENT_AUDIT: "Belge Denetimi",
  CUSTOM: "Özel Denetim",
};

export const AUDIT_TEMPLATE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Taslak",
  REVIEW: "İncelemede",
  APPROVED: "Onaylandı",
  PUBLISHED: "Yayımlandı",
  ARCHIVED: "Arşivlendi",
};

export const AUDIT_ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planlandı",
  ASSIGNED: "Atandı",
  IN_PROGRESS: "Devam Ediyor",
  SUBMITTED: "Gönderildi",
  REVIEW_REQUIRED: "İnceleme Bekliyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  OVERDUE: "Süresi Geçti",
  CANCELLED: "İptal Edildi",
  COMPLETED: "Tamamlandı",
};

export const AUDIT_RESULT_LABELS: Record<string, string> = {
  EXCELLENT: "Mükemmel",
  PASSED: "Başarılı",
  CONDITIONAL_PASS: "Şartlı Başarılı",
  FAILED: "Başarısız",
  CRITICAL_FAILURE: "Kritik Başarısızlık",
  INCOMPLETE: "Eksik",
};

export const FINDING_SEVERITY_LABELS: Record<string, string> = {
  INFO: "Bilgilendirme",
  MINOR: "Düşük",
  MAJOR: "Önemli",
  CRITICAL: "Kritik",
};

export const CORRECTIVE_ACTION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Taslak",
  ASSIGNED: "Atandı",
  IN_PROGRESS: "Devam Ediyor",
  EVIDENCE_REQUIRED: "Kanıt Bekliyor",
  REVIEW_REQUIRED: "İnceleme Bekliyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  OVERDUE: "Süresi Geçti",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
};

export const BRANCH_CONCEPT_LABELS: Record<string, string> = {
  CORNER: "Corner",
  SELF_CAFE: "Self Cafe",
  CAFE: "Cafe",
  PREMIUM_CAFE: "Premium Cafe",
  HOTEL_KIOSK: "Otel Kiosku",
  MOBILE: "Mobil Konsept",
  OTHER: "Diğer",
};

export function label(map: Record<string, string>, value: string | null | undefined) {
  if (!value) return "—";
  return map[value] ?? value;
}

export function dateTR(value: Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" }).format(value);
}

export function percentTR(value: number) {
  return `%${value.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;
}
