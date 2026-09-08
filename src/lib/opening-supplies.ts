export const OPENING_SUPPLY_SECTIONS = [
  ["EKIPMAN", "Ekipman"],
  ["ZUCCACIYE", "Züccaciye"],
  ["ACILIS_MALI", "Açılış Malı"],
] as const;

export const OPENING_SUPPLY_SOURCE_CATEGORIES = [
  ["ICEBERRY_DEPO", "Iceberry Depo"],
  ["DIS_ALIM", "Dış Alım"],
  ["BAYI_ALACAK", "Bayi Alacak"],
  ["KONSIYE", "Konsinye"],
] as const;

export const OPENING_SUPPLY_RESPONSIBLE_PARTIES = [
  ["ICEBERRY", "Iceberry"],
  ["BAYI", "Bayi"],
  ["DIS_TEDARIKCI", "Dış Tedarikçi"],
  ["KONSIYE_TEDARIKCI", "Konsinye Tedarikçi"],
] as const;

export const OPENING_SUPPLY_STATUSES = [
  ["BEKLIYOR", "Bekliyor"],
  ["DEVAM_EDIYOR", "Devam Ediyor"],
  ["TAMAMLANDI", "Tamamlandı"],
] as const;

export const OPENING_SUPPLY_LOGISTICS_STATUSES = [
  ["SIPARIS", "Sipariş"],
  ["FATURASI_GELDI", "Faturası Geldi"],
  ["DEPODA", "Depoda"],
  ["SEVKE_HAZIR", "Sevke Hazır"],
  ["TESLIM_EDILDI", "Teslim Edildi"],
] as const;

export const openingSupplySectionLabels = Object.fromEntries(OPENING_SUPPLY_SECTIONS) as Record<string, string>;
export const openingSupplyCategoryLabels = Object.fromEntries(OPENING_SUPPLY_SOURCE_CATEGORIES) as Record<string, string>;
export const openingSupplyResponsibleLabels = Object.fromEntries(OPENING_SUPPLY_RESPONSIBLE_PARTIES) as Record<string, string>;
export const openingSupplyStatusLabels = Object.fromEntries(OPENING_SUPPLY_STATUSES) as Record<string, string>;
export const openingSupplyLogisticsStatusLabels = Object.fromEntries(OPENING_SUPPLY_LOGISTICS_STATUSES) as Record<string, string>;

export const openingSupplyLogisticsProgress: Record<string, number> = {
  SIPARIS: 20,
  FATURASI_GELDI: 40,
  DEPODA: 60,
  SEVKE_HAZIR: 80,
  TESLIM_EDILDI: 100,
};

export type OpeningSupplySeedItem = {
  key: string;
  section: string;
  category: string;
  title: string;
  plannedQuantity?: number;
  quantityUnit?: string;
  responsibleParty: string;
  sortOrder: number;
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

const supply = (
  section: string,
  category: string,
  title: string,
  responsibleParty: string,
  sortOrder: number,
  plannedQuantity?: number,
  quantityUnit = "Adet",
): OpeningSupplySeedItem => ({
  key: `supply_${slug(section)}_${slug(category)}_${slug(title)}`,
  section,
  category,
  title,
  plannedQuantity,
  quantityUnit,
  responsibleParty,
  sortOrder,
});

export const defaultOpeningSupplyItems: OpeningSupplySeedItem[] = [
  supply("EKIPMAN", "DIS_ALIM", "Çiçek waffle makinesi", "DIS_TEDARIKCI", 10),
  supply("EKIPMAN", "DIS_ALIM", "Bubble waffle makinesi", "DIS_TEDARIKCI", 20),
  supply("EKIPMAN", "DIS_ALIM", "Çay kazanı", "DIS_TEDARIKCI", 30),
  supply("EKIPMAN", "DIS_ALIM", "Bulaşık makinesi", "DIS_TEDARIKCI", 40),
  supply("EKIPMAN", "DIS_ALIM", "Buz makinesi", "DIS_TEDARIKCI", 50),
  supply("EKIPMAN", "DIS_ALIM", "Bar blender", "DIS_TEDARIKCI", 60),
  supply("EKIPMAN", "DIS_ALIM", "Espresso makinesi", "DIS_TEDARIKCI", 70),
  supply("EKIPMAN", "DIS_ALIM", "Kahve değirmeni", "DIS_TEDARIKCI", 80),
  supply("EKIPMAN", "ICEBERRY_DEPO", "Otomasyon ve fişmatik", "ICEBERRY", 90),
  supply("EKIPMAN", "DIS_ALIM", "POS makinesi", "ICEBERRY", 100),
  supply("EKIPMAN", "DIS_ALIM", "Garnitür dolabı", "DIS_TEDARIKCI", 110),
  supply("EKIPMAN", "DIS_ALIM", "TV ve askı aparatı", "DIS_TEDARIKCI", 120),

  supply("ZUCCACIYE", "DIS_ALIM", "Maşa şeker", "DIS_TEDARIKCI", 10),
  supply("ZUCCACIYE", "DIS_ALIM", "Sos kaşığı", "DIS_TEDARIKCI", 20),
  supply("ZUCCACIYE", "DIS_ALIM", "Kesim panosu", "DIS_TEDARIKCI", 30),
  supply("ZUCCACIYE", "DIS_ALIM", "Sebze bıçağı", "DIS_TEDARIKCI", 40),
  supply("ZUCCACIYE", "DIS_ALIM", "Sosluk fişek", "DIS_TEDARIKCI", 50),
  supply("ZUCCACIYE", "DIS_ALIM", "Saklama kabı", "DIS_TEDARIKCI", 60),
  supply("ZUCCACIYE", "DIS_ALIM", "Kepçe", "DIS_TEDARIKCI", 70),
  supply("ZUCCACIYE", "DIS_ALIM", "Çırpıcı", "DIS_TEDARIKCI", 80),
  supply("ZUCCACIYE", "DIS_ALIM", "Karton bardak standı", "DIS_TEDARIKCI", 90),
  supply("ZUCCACIYE", "DIS_ALIM", "Tepsi", "DIS_TEDARIKCI", 100),
  supply("ZUCCACIYE", "DIS_ALIM", "Kahve fincan takımı", "DIS_TEDARIKCI", 110),
  supply("ZUCCACIYE", "DIS_ALIM", "Sunum tabağı", "DIS_TEDARIKCI", 120),

  supply("ACILIS_MALI", "ICEBERRY_DEPO", "Açılış hammadde Iceberry", "ICEBERRY", 10),
  supply("ACILIS_MALI", "ICEBERRY_DEPO", "Waffle karışımı", "ICEBERRY", 20),
  supply("ACILIS_MALI", "ICEBERRY_DEPO", "Bubble waffle karışımı", "ICEBERRY", 30),
  supply("ACILIS_MALI", "ICEBERRY_DEPO", "Magnolya karışımı", "ICEBERRY", 40),
  supply("ACILIS_MALI", "ICEBERRY_DEPO", "Çekirdek kahve", "ICEBERRY", 50),
  supply("ACILIS_MALI", "ICEBERRY_DEPO", "Bardak ve kapak seti", "ICEBERRY", 60),
  supply("ACILIS_MALI", "ICEBERRY_DEPO", "Waffle kutusu ve külah", "ICEBERRY", 70),
  supply("ACILIS_MALI", "DIS_ALIM", "Temizlik malzemeleri", "DIS_TEDARIKCI", 80),
  supply("ACILIS_MALI", "BAYI_ALACAK", "Bayinin alacağı garnitürler", "BAYI", 90),
  supply("ACILIS_MALI", "BAYI_ALACAK", "Süt ve günlük ürünler", "BAYI", 100),
  supply("ACILIS_MALI", "KONSIYE", "Algida soğutucu ve ürünler", "KONSIYE_TEDARIKCI", 110),
  supply("ACILIS_MALI", "KONSIYE", "Coca-Cola dolabı ve ürünler", "KONSIYE_TEDARIKCI", 120),
];

export function openingSupplyPercentage(items: { status: string; archivedAt?: Date | string | null }[]) {
  const activeItems = items.filter((item) => !item.archivedAt);
  if (!activeItems.length) return 0;
  const completed = activeItems.filter((item) => item.status === "TAMAMLANDI").length;
  return Math.round((completed / activeItems.length) * 100);
}

export function openingSupplyCompletedCount(items: { status: string; archivedAt?: Date | string | null }[]) {
  return items.filter((item) => !item.archivedAt && item.status === "TAMAMLANDI").length;
}

export function openingSupplyActiveCount(items: { archivedAt?: Date | string | null }[]) {
  return items.filter((item) => !item.archivedAt).length;
}
