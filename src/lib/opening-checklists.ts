export const OPENING_SETUP_STATUSES = [
  ["BEKLIYOR", "Bekliyor"],
  ["MERKEZDE", "Merkezde"],
  ["YATIRIMCIDA", "Yatırımcıda"],
  ["IMALATTA", "İmalatta"],
  ["DEVAM_EDIYOR", "Devam Ediyor"],
  ["TAMAMLANDI", "Tamamlandı"],
  ["IPTAL", "İptal"],
] as const;

export const OPENING_DOCUMENT_STATUSES = [
  ["TALEP_EDILDI", "Talep Edildi"],
  ["BEKLENIYOR", "Bekleniyor"],
  ["GELDI", "Geldi"],
  ["KONTROL_EDILDI", "Kontrol Edildi"],
  ["EKSIK", "Eksik"],
  ["GEREKLI_DEGIL", "Gerekli Değil"],
] as const;

export const OPENING_RESPONSIBLE_DEPARTMENTS = [
  ["OPERATIONS", "Operasyon"],
  ["ARCHITECTURE", "Mimari Proje ve Uygulama"],
  ["PURCHASING", "Satın Alma"],
  ["WAREHOUSE_LOGISTICS", "Depo ve Lojistik"],
  ["EDUCATION", "Eğitim"],
  ["MARKETING", "Reklam Uygulamaları"],
  ["FINANCE", "Finans"],
  ["INVESTOR", "Yatırımcı"],
] as const;

export const OPENING_SETUP_CATEGORIES = [
  "Organizasyon",
  "Altyapı",
  "Mimari ve İnşaat",
  "Tabela ve Görsel",
] as const;

export const OPENING_SETUP_CATEGORY_ORDER = ["Organizasyon", "Altyapı", "Mimari ve İnşaat", "Tabela ve Görsel"] as const;
export const OPENING_SUPPLY_SECTION_ORDER = ["EKIPMAN", "ZUCCACIYE", "ACILIS_MALI"] as const;
export const OPENING_PLAN_SECTION_ORDER = ["Organizasyon", "Altyapı", "Mimari ve İnşaat", "EKIPMAN", "ZUCCACIYE", "Tabela ve Görsel", "ACILIS_MALI"] as const;

export const OPENING_LOGISTICS_CATEGORIES: string[] = [];

export const OPENING_LOGISTICS_STATUSES = [
  ["SIPARIS", "Sipariş"],
  ["FATURASI_GELDI", "Faturası Geldi"],
  ["DEPODA", "Depoda"],
  ["SEVKE_HAZIR", "Sevke Hazır"],
  ["TESLIM_EDILDI", "Teslim Edildi"],
] as const;

export const OPENING_DOCUMENT_CATEGORIES = ["Sözleşme", "Şirket Evrakı", "Resmi Evrak", "Teknik Evrak", "Operasyon"] as const;
export const HIDDEN_OPENING_DOCUMENT_TITLES = ["Kira sözleşmesi", "Ruhsat başvuru belgesi", "Belediye uygunluk evrakı", "Tabela onayı"] as const;

export const setupStatusLabels = Object.fromEntries(OPENING_SETUP_STATUSES) as Record<string, string>;
export const documentStatusLabels = Object.fromEntries(OPENING_DOCUMENT_STATUSES) as Record<string, string>;
export const responsibleDepartmentLabels = Object.fromEntries(OPENING_RESPONSIBLE_DEPARTMENTS) as Record<string, string>;
export const openingLogisticsStatusLabels = Object.fromEntries(OPENING_LOGISTICS_STATUSES) as Record<string, string>;
export const openingLogisticsStatusProgress: Record<string, number> = {
  SIPARIS: 20,
  FATURASI_GELDI: 40,
  DEPODA: 60,
  SEVKE_HAZIR: 80,
  TESLIM_EDILDI: 100,
};

export type OpeningChecklistSeedItem = {
  key: string;
  category: string;
  title: string;
  description?: string;
  responsibleDepartment: string;
  sortOrder: number;
};

export type OpeningDocumentSeedItem = OpeningChecklistSeedItem & {
  companyTypeCondition?: string;
};

const slug = (value: string) =>
  value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const setup = (category: string, title: string, responsibleDepartment: string, sortOrder: number, description?: string): OpeningChecklistSeedItem => ({
  key: `setup_${slug(category)}_${slug(title)}`,
  category,
  title,
  responsibleDepartment,
  sortOrder,
  description,
});

const doc = (category: string, title: string, sortOrder: number, companyTypeCondition?: string): OpeningDocumentSeedItem => ({
  key: `document_${slug(category)}_${slug(title)}`,
  category,
  title,
  responsibleDepartment: "OPERATIONS",
  sortOrder,
  companyTypeCondition,
});

export const defaultOpeningSetupItems: OpeningChecklistSeedItem[] = [
  setup("Organizasyon", "İsim hakkı", "FINANCE", 10),
  setup("Organizasyon", "Konsinye Cola dik dolap", "PURCHASING", 20),
  setup("Organizasyon", "Konsinye Algida teşhir dolabı", "PURCHASING", 30),
  setup("Organizasyon", "Otomasyon GMU / GMÖEBYS belgesine başvuru", "OPERATIONS", 40),
  setup("Organizasyon", "Otomasyon Iceberry'den Pavo'ya gönderim", "OPERATIONS", 50),
  setup("Organizasyon", "Otomasyon Pavo onay", "OPERATIONS", 60),
  setup("Organizasyon", "Otomasyon Iceberry tarafından POS seri numarasının bayiye gönderimi", "OPERATIONS", 70),
  setup("Organizasyon", "Otomasyon bayinin POS seri numarasını anlaştığı bankaya bildirimi", "INVESTOR", 80),
  setup("Organizasyon", "Otomasyon banka terminal tanımlamasının oluşturulması", "INVESTOR", 90),
  setup("Organizasyon", "Otomasyon POS aktif edilmesi", "OPERATIONS", 100),
  setup("Altyapı", "Elektrik altyapısı", "INVESTOR", 110),
  setup("Altyapı", "Su arıtma hazırlığı", "INVESTOR", 120),
  setup("Altyapı", "Cihaz su giderlerinin altyapı hazırlığı", "INVESTOR", 130),
  setup("Altyapı", "İklimlendirme", "INVESTOR", 140),
  setup("Altyapı", "Ses sistemi", "INVESTOR", 150),
  setup("Altyapı", "Aydınlatma", "INVESTOR", 160),
  setup("Altyapı", "Kamera sistemi", "INVESTOR", 170),
  setup("Mimari ve İnşaat", "Mimari çizim", "ARCHITECTURE", 180),
  setup("Mimari ve İnşaat", "Yer döşeme", "INVESTOR", 190),
  setup("Mimari ve İnşaat", "Duvar örme", "INVESTOR", 200),
  setup("Mimari ve İnşaat", "TV demir altyapısı", "INVESTOR", 210),
  setup("Mimari ve İnşaat", "Lavabo / WC", "INVESTOR", 220),
  setup("Mimari ve İnşaat", "Boya", "INVESTOR", 230),
  setup("Mimari ve İnşaat", "Alçıpan", "INVESTOR", 240),
  setup("Mimari ve İnşaat", "Tente", "INVESTOR", 250),
  setup("Mimari ve İnşaat", "Mobilya imalat ve montaj", "ARCHITECTURE", 260),
  setup("Tabela ve Görsel", "Fener tabela", "MARKETING", 270),
  setup("Tabela ve Görsel", "Fileli krom alın tabela", "MARKETING", 280),
  setup("Tabela ve Görsel", "İç mekan kanvas tablolar", "MARKETING", 290),
  setup("Tabela ve Görsel", "İç mekan ışıklı tabela", "MARKETING", 300),
  setup("Tabela ve Görsel", "Duvar kağıdı", "INVESTOR", 310),
  setup("Tabela ve Görsel", "Menüboard TV", "MARKETING", 320),
  setup("Tabela ve Görsel", "Masa üstü QR menü", "MARKETING", 330),
  setup("Tabela ve Görsel", "El menüsü", "MARKETING", 340),
];

export const defaultOpeningDocumentItems: OpeningDocumentSeedItem[] = [
  doc("Sözleşme", "Franchise sözleşmesi", 10),
  doc("Şirket Evrakı", "Vergi levhası", 30),
  doc("Şirket Evrakı", "Ticaret sicil gazetesi", 40, "Şirket ise"),
  doc("Şirket Evrakı", "İmza sirküleri", 50, "Şirket ise"),
  doc("Şirket Evrakı", "İmza beyannamesi", 60, "Şahıs ise"),
  doc("Teknik Evrak", "Mimari proje dosyası", 90),
  doc("Operasyon", "Eğitim katılım listesi", 110),
  doc("Operasyon", "Açılış teslim tutanağı", 120),
];

export function isHotelOpeningConcept(concept?: string | null) {
  const normalized = String(concept || "").trim().toLocaleUpperCase("tr-TR");
  return normalized === "HOTEL" || normalized === "OTEL";
}

export function isOpeningLogisticsCategory(category?: string | null) {
  return OPENING_LOGISTICS_CATEGORIES.includes(String(category || "") as (typeof OPENING_LOGISTICS_CATEGORIES)[number]);
}

export function checklistPercentage(items: { status: string }[]) {
  if (!items.length) return 0;
  const completed = items.filter((item) => ["TAMAMLANDI", "KONTROL_EDILDI", "GEREKLI_DEGIL"].includes(item.status)).length;
  return Math.round((completed / items.length) * 100);
}

export function weightedOpeningPlanPercentage(
  setupItems: { category: string; status: string; archivedAt?: Date | string | null }[],
  supplyItems: { section: string; status: string; archivedAt?: Date | string | null }[] = [],
) {
  const sectionScores: number[] = [];

  for (const category of OPENING_SETUP_CATEGORY_ORDER) {
    const categoryItems = setupItems.filter((item) => !item.archivedAt && item.category === category);
    if (categoryItems.length) sectionScores.push(checklistPercentage(categoryItems));
  }

  for (const section of OPENING_SUPPLY_SECTION_ORDER) {
    const sectionItems = supplyItems.filter((item) => !item.archivedAt && item.section === section);
    if (sectionItems.length) sectionScores.push(checklistPercentage(sectionItems));
  }

  if (!sectionScores.length) return 0;
  return Math.round(sectionScores.reduce((sum, score) => sum + score, 0) / sectionScores.length);
}
