import type {
  OpeningBudgetStatus,
  OpeningMilestoneStatus,
  OpeningPriority,
  OpeningProjectStatus,
  OpeningRiskLevel,
  OpeningRiskStatus,
  OpeningStageStatus,
  OpeningTemplateStatus,
} from "@prisma/client";

export const OPENING_STATUSES = {
  PLANNING: "Planlama",
  LOCATION_APPROVAL: "Lokasyon Onayı",
  CONTRACT_PROCESS: "Sözleşme Süreci",
  ARCHITECTURAL_PROJECT: "Mimari Proje",
  PRODUCTION: "Üretim",
  SHIPMENT: "Sevkiyat",
  INSTALLATION: "Kurulum",
  TRAINING: "Eğitim",
  SOFT_OPENING: "Soft Opening",
  GRAND_OPENING: "Grand Opening",
  COMPLETED: "Tamamlandı",
  ON_HOLD: "Beklemede",
  CANCELLED: "İptal",
} as const;

export const STAGE_STATUSES = {
  NOT_STARTED: "Başlamadı",
  IN_PROGRESS: "Devam Ediyor",
  COMPLETED: "Tamamlandı",
  DELAYED: "Gecikti",
  BLOCKED: "Engellendi",
  CANCELLED: "İptal",
} as const;

export const TASK_PRIORITIES = { LOW: "Düşük", NORMAL: "Normal", HIGH: "Yüksek", URGENT: "Acil" } as const;
export const TASK_STATUSES = { OPEN: "Açık", IN_PROGRESS: "Devam Ediyor", COMPLETED: "Tamamlandı", CANCELLED: "İptal" } as const;

export const DEFAULT_STAGES = [
  "Sözleşme ve Evraklar",
  "Lokasyon Onayı",
  "Mimari Proje",
  "AVM / Belediye Onayları",
  "Üretim",
  "Sevkiyat",
  "Kurulum",
  "Personel Seçimi",
  "Eğitim",
  "Ürün ve Açılış Stoğu",
  "Soft Opening",
  "Grand Opening",
];

export const openingProjectStatusLabels: Record<OpeningProjectStatus, string> = {
  DRAFT: "Taslak",
  PLANNING: "Planlama",
  IN_PROGRESS: "Devam Ediyor",
  ON_HOLD: "Beklemeye Alındı",
  AT_RISK: "Risk Altında",
  DELAYED: "Gecikmiş",
  READY_FOR_REVIEW: "Açılış İncelemesine Hazır",
  READY_FOR_OPENING: "Açılışa Hazır",
  OPENED: "Açıldı",
  POST_OPENING: "Açılış Sonrası Takip",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
};

export const openingTemplateStatusLabels: Record<OpeningTemplateStatus, string> = {
  DRAFT: "Taslak",
  REVIEW: "İncelemede",
  APPROVED: "Onaylandı",
  PUBLISHED: "Yayımlandı",
  ARCHIVED: "Arşivlendi",
};

export const openingStageStatusLabels: Record<OpeningStageStatus, string> = {
  NOT_STARTED: "Başlamadı",
  READY_TO_START: "Başlamaya Hazır",
  IN_PROGRESS: "Devam Ediyor",
  BLOCKED: "Engellendi",
  AT_RISK: "Risk Altında",
  DELAYED: "Gecikmiş",
  COMPLETED: "Tamamlandı",
  SKIPPED: "Atlandı",
  CANCELLED: "İptal Edildi",
};

export const openingMilestoneStatusLabels: Record<OpeningMilestoneStatus, string> = {
  PENDING: "Bekliyor",
  READY_TO_START: "Başlamaya Hazır",
  IN_PROGRESS: "Devam Ediyor",
  WAITING_APPROVAL: "Onay Bekliyor",
  WAITING_CORRECTION: "Düzeltme Bekliyor",
  COMPLETED: "Tamamlandı",
  BLOCKED: "Engellendi",
  DELAYED: "Gecikmiş",
  SKIPPED: "Atlandı",
  CANCELLED: "İptal Edildi",
};

export const openingPriorityLabels: Record<OpeningPriority, string> = {
  LOW: "Düşük",
  NORMAL: "Normal",
  HIGH: "Yüksek",
  URGENT: "Acil",
};

export const openingRiskLevelLabels: Record<OpeningRiskLevel, string> = {
  LOW: "Düşük",
  MEDIUM: "Orta",
  HIGH: "Yüksek",
  CRITICAL: "Kritik",
};

export const openingRiskStatusLabels: Record<OpeningRiskStatus, string> = {
  OPEN: "Açık",
  WATCHING: "İzleniyor",
  MITIGATED: "Azaltıldı",
  RESOLVED: "Çözüldü",
  CLOSED: "Kapandı",
};

export const openingBudgetStatusLabels: Record<OpeningBudgetStatus, string> = {
  PLANNED: "Planlandı",
  APPROVED: "Onaylandı",
  SPENT: "Gerçekleşti",
  OVER_BUDGET: "Bütçe Aşıldı",
  CANCELLED: "İptal Edildi",
};

export const defaultOpeningTemplateStages = [
  ["PROJECT_START", "Proje Başlangıcı"],
  ["LOCATION_CONTRACT", "Lokasyon ve Sözleşme Kontrolü"],
  ["SITE_SURVEY", "Mimari Keşif"],
  ["ARCHITECTURAL_APPROVALS", "Mimari Proje ve Onaylar"],
  ["PERMITS", "Ruhsat ve Resmî İzinler"],
  ["CONSTRUCTION", "İnşaat ve Tadilat"],
  ["EQUIPMENT", "Ekipman ve Teknik Kurulum"],
  ["INITIAL_STOCK", "Ürün ve İlk Stok"],
  ["STAFF_TRAINING", "Personel ve Eğitim"],
  ["DIGITAL_FINANCE", "Dijital ve Finansal Sistemler"],
  ["MARKETING", "Açılış Pazarlaması"],
  ["PRE_OPENING_AUDIT", "Açılış Öncesi Denetim"],
  ["READINESS_APPROVAL", "Açılışa Hazır Onayı"],
  ["OPENING_DAY", "Açılış Günü"],
  ["POST_OPENING", "Açılış Sonrası Takip"],
] as const;

export const defaultMilestonesByStage: Record<string, { code: string; name: string; critical?: boolean; approval?: boolean; document?: boolean; audit?: boolean; tasks: string[] }[]> = {
  PROJECT_START: [{ code: "KICKOFF", name: "Açılış proje başlangıcı", tasks: ["Kick-off toplantısını yap", "Sorumluları ata"] }],
  LOCATION_CONTRACT: [{ code: "CONTRACT_LOCATION_CHECK", name: "Sözleşme ve lokasyon kontrolü", critical: true, document: true, tasks: ["Kira/sözleşme belgelerini kontrol et"] }],
  SITE_SURVEY: [{ code: "SITE_SURVEY", name: "Mimari keşif tamamlandı", critical: true, tasks: ["Keşif randevusunu planla", "Keşif fotoğraflarını yükle"] }],
  ARCHITECTURAL_APPROVALS: [{ code: "ARCHITECTURAL_APPROVAL", name: "Mimari proje onayı", critical: true, approval: true, document: true, tasks: ["Mimari projeyi yükle", "AVM/mülk sahibi onayını takip et"] }],
  PERMITS: [{ code: "PERMITS_READY", name: "Ruhsat ve resmî izinler hazır", critical: true, document: true, tasks: ["Ruhsat başvurusunu takip et", "Eksik belge kontrolü yap"] }],
  CONSTRUCTION: [{ code: "CONSTRUCTION_COMPLETED", name: "İnşaat ve tadilat tamamlandı", critical: true, tasks: ["İnşaat ilerlemesini güncelle", "Kalite kontrolünü yap"] }],
  EQUIPMENT: [{ code: "EQUIPMENT_INSTALLED", name: "Ekipman teslim ve kurulum", critical: true, tasks: ["Ekipman siparişlerini kontrol et", "Kurulum testini yap"] }],
  INITIAL_STOCK: [{ code: "INITIAL_STOCK_READY", name: "İlk stok hazır", critical: true, tasks: ["İlk stok planını onayla", "İlk ürün teslimatını doğrula"] }],
  STAFF_TRAINING: [{ code: "TRAINING_COMPLETED", name: "Personel ve eğitim hazır", critical: true, tasks: ["Personel planını tamamla", "Zorunlu eğitimleri tamamla"] }],
  DIGITAL_FINANCE: [{ code: "SYSTEMS_READY", name: "POS, internet ve finans sistemleri hazır", critical: true, tasks: ["POS testini yap", "Ticimax ve Paraşüt hazırlığını kontrol et"] }],
  MARKETING: [{ code: "MARKETING_READY", name: "Açılış pazarlaması hazır", tasks: ["Açılış duyuru planını hazırla"] }],
  PRE_OPENING_AUDIT: [{ code: "PRE_OPENING_AUDIT", name: "Açılış öncesi denetim", critical: true, audit: true, approval: true, tasks: ["Açılış denetimini planla"] }],
  READINESS_APPROVAL: [{ code: "READY_APPROVAL", name: "Açılışa hazır onayı", critical: true, approval: true, tasks: ["Hazırlık puanını hesapla", "Yönetici onayı talep et"] }],
  OPENING_DAY: [{ code: "OPENING_DAY_CHECK", name: "Açılış günü kontrolü", critical: true, tasks: ["Açılış günü kontrol listesini tamamla"] }],
  POST_OPENING: [{ code: "POST_OPENING_90", name: "90 günlük takip tamamlandı", tasks: ["7 günlük takip", "30 günlük takip", "60 günlük takip", "90 günlük takip"] }],
};

export const openingLabel = (map: Record<string, string>, value: string) => map[value] ?? value;
export const isClosed = (status: string) => ["COMPLETED", "CANCELLED"].includes(status);

export function dateTR(value: Date | string | null | undefined) {
  if (!value) return "Belirtilmedi";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" }).format(new Date(value));
}

export function moneyTR(value: unknown, currency = "TRY") {
  const number = typeof value === "number" ? value : Number(value ?? 0);
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency, minimumFractionDigits: 2 }).format(Number.isFinite(number) ? number : 0);
}
