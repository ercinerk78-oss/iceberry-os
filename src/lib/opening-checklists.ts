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
  "Altyapı",
  "Mimari ve İnşaat",
  "Tabela ve Görsel",
  "Ekipman",
  "Operasyon Hazırlığı",
  "Açılış",
] as const;

export const OPENING_DOCUMENT_CATEGORIES = ["Sözleşme", "Şirket Evrakı", "Resmi Evrak", "Teknik Evrak", "Operasyon"] as const;
export const HIDDEN_OPENING_DOCUMENT_TITLES = ["Kira sözleşmesi", "Ruhsat başvuru belgesi", "Belediye uygunluk evrakı", "Tabela onayı"] as const;

export const setupStatusLabels = Object.fromEntries(OPENING_SETUP_STATUSES) as Record<string, string>;
export const documentStatusLabels = Object.fromEntries(OPENING_DOCUMENT_STATUSES) as Record<string, string>;
export const responsibleDepartmentLabels = Object.fromEntries(OPENING_RESPONSIBLE_DEPARTMENTS) as Record<string, string>;

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
  setup("Altyapı", "Elektrik altyapısı", "INVESTOR", 10),
  setup("Altyapı", "Su arıtma hazırlığı", "INVESTOR", 20),
  setup("Altyapı", "Cihaz su giderlerinin altyapı hazırlığı", "INVESTOR", 30),
  setup("Altyapı", "İklimlendirme", "INVESTOR", 40),
  setup("Altyapı", "Ses sistemi", "INVESTOR", 50),
  setup("Altyapı", "Aydınlatma", "INVESTOR", 60),
  setup("Altyapı", "Kamera sistemi", "INVESTOR", 70),
  setup("Mimari ve İnşaat", "Mimari çizim", "ARCHITECTURE", 80),
  setup("Mimari ve İnşaat", "Yer döşeme", "INVESTOR", 90),
  setup("Mimari ve İnşaat", "Duvar örme", "INVESTOR", 100),
  setup("Mimari ve İnşaat", "TV demir altyapısı", "INVESTOR", 110),
  setup("Mimari ve İnşaat", "Lavabo / WC", "INVESTOR", 120),
  setup("Mimari ve İnşaat", "Boya", "INVESTOR", 130),
  setup("Mimari ve İnşaat", "Alçıpan", "INVESTOR", 140),
  setup("Mimari ve İnşaat", "Tente", "INVESTOR", 150),
  setup("Mimari ve İnşaat", "Mobilya imalat ve montaj", "ARCHITECTURE", 155),
  setup("Tabela ve Görsel", "Fener tabela", "MARKETING", 160),
  setup("Tabela ve Görsel", "Fileli krom alın tabela", "MARKETING", 170),
  setup("Tabela ve Görsel", "İç mekan kanvas tablolar", "MARKETING", 180),
  setup("Tabela ve Görsel", "İç mekan ışıklı tabela", "MARKETING", 190),
  setup("Tabela ve Görsel", "Duvar kağıdı", "INVESTOR", 200),
  setup("Tabela ve Görsel", "Menüboard TV", "MARKETING", 210),
  setup("Tabela ve Görsel", "Masa üstü QR menü", "MARKETING", 220),
  setup("Tabela ve Görsel", "El menüsü", "MARKETING", 230),
  setup("Ekipman", "Otomasyon sistemi", "OPERATIONS", 280),
  setup("Ekipman", "Adisyon yazıcı", "PURCHASING", 290),
  setup("Ekipman", "POS makinesi", "FINANCE", 300),
  setup("Ekipman", "FY makinesi", "PURCHASING", 310),
  setup("Ekipman", "Topping bar", "PURCHASING", 320),
  setup("Ekipman", "Buz makinesi", "PURCHASING", 330),
  setup("Ekipman", "Mixer", "PURCHASING", 340),
  setup("Ekipman", "Bar blender", "PURCHASING", 350),
  setup("Ekipman", "Çaycı", "PURCHASING", 360),
  setup("Ekipman", "Bubble waffle makinesi", "PURCHASING", 370),
  setup("Ekipman", "Çiçek waffle makinesi", "PURCHASING", 380),
  setup("Ekipman", "Filtre kahve makinesi", "PURCHASING", 390),
  setup("Ekipman", "Türk kahve makinesi", "PURCHASING", 400),
  setup("Ekipman", "Kollu meyve sıkacağı", "PURCHASING", 410),
  setup("Ekipman", "Katı meyve sıkacağı", "PURCHASING", 420),
  setup("Ekipman", "Limonata şerbetlik", "PURCHASING", 430),
  setup("Ekipman", "Bulaşık makinesi", "PURCHASING", 440),
  setup("Ekipman", "Bulaşık makinesi süzgeci ve deterjanı", "INVESTOR", 450),
  setup("Ekipman", "Mikrodalga fırın", "PURCHASING", 460),
  setup("Ekipman", "Fırın", "PURCHASING", 470),
  setup("Ekipman", "Çekirdek kahve değirmeni", "PURCHASING", 480),
  setup("Ekipman", "Çekirdek kahve makinesi", "PURCHASING", 490),
  setup("Ekipman", "Hassas tartı", "PURCHASING", 500),
  setup("Ekipman", "Mutfak evye ve batarya", "INVESTOR", 510),
  setup("Operasyon Hazırlığı", "Züccaciye", "PURCHASING", 520),
  setup("Operasyon Hazırlığı", "Baskılı tabak ve fincan", "PURCHASING", 530),
  setup("Operasyon Hazırlığı", "Baskılı üniforma", "PURCHASING", 540),
  setup("Operasyon Hazırlığı", "Temizlik malzemeleri", "PURCHASING", 550),
  setup("Operasyon Hazırlığı", "Eğitim kitapçığı", "EDUCATION", 560),
  setup("Açılış", "İsim hakkı", "FINANCE", 570),
  setup("Açılış", "Açılış hammadde", "INVESTOR", 580),
  setup("Açılış", "Açılış hammadde Iceberry", "WAREHOUSE_LOGISTICS", 590),
  setup("Açılış", "Organizasyon", "OPERATIONS", 600),
  setup("Açılış", "Nakliye", "WAREHOUSE_LOGISTICS", 610),
  setup("Açılış", "Merkezi anlaşmalı konsinye makineler", "PURCHASING", 620),
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

export function checklistPercentage(items: { status: string }[]) {
  if (!items.length) return 0;
  const completed = items.filter((item) => ["TAMAMLANDI", "KONTROL_EDILDI", "GEREKLI_DEGIL"].includes(item.status)).length;
  return Math.round((completed / items.length) * 100);
}
