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
  supply("EKIPMAN", "DIS_ALIM", "Çiçek waffle makinesi - WFL01.E12 - Kalp 170", "DIS_TEDARIKCI", 10),
  supply("EKIPMAN", "DIS_ALIM", "Bubble waffle makinesi - WFL12.E12 - Balls Omk.WFL12 E12.0301.Z5F", "DIS_TEDARIKCI", 20),
  supply("EKIPMAN", "DIS_ALIM", "Çay kazanı OMAKE - CAY01.E11 - 23 Lt Omk.CAY01 E11.0023.Z5F", "DIS_TEDARIKCI", 30),
  supply("EKIPMAN", "DIS_ALIM", "Dedeoğlu 3'lü bakır çay kazanı ve Kahveci No:3 demlikleri", "DIS_TEDARIKCI", 40),
  supply("EKIPMAN", "DIS_ALIM", "Bulaşık makinesi Öztiryakiler - OBY500 - 500 tabak", "DIS_TEDARIKCI", 50),
  supply("EKIPMAN", "DIS_ALIM", "Frozen yoğurt makinesi - set üstü tercihli", "DIS_TEDARIKCI", 60),
  supply("EKIPMAN", "DIS_ALIM", "Buz makinesi Vosco - 45 kg/gün küp buz VSC-40C", "DIS_TEDARIKCI", 70),
  supply("EKIPMAN", "DIS_ALIM", "Buz makinesi Vosco - 20 kg", "DIS_TEDARIKCI", 80),
  supply("EKIPMAN", "DIS_ALIM", "Buz makinesi Vosco - 12 kg 12C", "DIS_TEDARIKCI", 90),
  supply("EKIPMAN", "DIS_ALIM", "Bar blender Pro Dijital 2 Lt buz kırıcılı VHS-206C Vosco", "DIS_TEDARIKCI", 100),
  supply("EKIPMAN", "DIS_ALIM", "Espresso makinesi Simonelli Appia - iki gruplu yüksek kaşıklı", "DIS_TEDARIKCI", 110),
  supply("EKIPMAN", "DIS_ALIM", "Kahve değirmeni Space Tron Inox", "DIS_TEDARIKCI", 120),
  supply("EKIPMAN", "DIS_ALIM", "Electric Cord Zenius ZN100 / ZN100-EUR2 / Aeroccino XL", "DIS_TEDARIKCI", 130),
  supply("EKIPMAN", "ICEBERRY_DEPO", "Otomasyon ve fişmatik", "ICEBERRY", 140),
  supply("EKIPMAN", "DIS_ALIM", "POS makinesi", "ICEBERRY", 150),
  supply("EKIPMAN", "DIS_ALIM", "Garnitür dolabı - 2 metre", "DIS_TEDARIKCI", 160),
  supply("EKIPMAN", "DIS_ALIM", "Ahşap box", "DIS_TEDARIKCI", 170),
  supply("EKIPMAN", "DIS_ALIM", "Tekli şerbetlik Vosco", "DIS_TEDARIKCI", 180),
  supply("EKIPMAN", "DIS_ALIM", "Çikolata çeşmesi", "DIS_TEDARIKCI", 190),
  supply("EKIPMAN", "DIS_ALIM", "43 inç TV Samsung LS 43DM702UUXUF LED monitör TV", "DIS_TEDARIKCI", 200),
  supply("EKIPMAN", "DIS_ALIM", "TV askı aparatı - 37/40/50/55/65 inç uyumlu", "DIS_TEDARIKCI", 210),
  supply("EKIPMAN", "DIS_ALIM", "USB Dahua 4GB metal flash bellek U106", "DIS_TEDARIKCI", 220),
  supply("EKIPMAN", "DIS_ALIM", "USB uzatıcı kablo Derwell 1.5 metre dişi erkek USB 2.0", "DIS_TEDARIKCI", 230),
  supply("EKIPMAN", "DIS_ALIM", "Çay süzgeci Bubble Tea - 3'lü küçük metal süzgeç seti", "DIS_TEDARIKCI", 240),
  supply("EKIPMAN", "DIS_ALIM", "Filtre kahve makinesi Homend Coffeebreak 5046H", "DIS_TEDARIKCI", 250),
  supply("EKIPMAN", "DIS_ALIM", "Türk kahve makinesi Arzum OK006 Okkaminio Duo - bakır", "DIS_TEDARIKCI", 260),
  supply("EKIPMAN", "DIS_ALIM", "Mikser Sinbo SMX 2747 el mikseri", "DIS_TEDARIKCI", 270),
  supply("EKIPMAN", "DIS_ALIM", "Klavye mouse Rapoo 8110M Bluetooth kablosuz Türkçe Q set", "DIS_TEDARIKCI", 280),
  supply("EKIPMAN", "DIS_ALIM", "Saklama ince uzun kaplar - Porsima Org-432 12'li jumbo 1700 ml", "DIS_TEDARIKCI", 290),
  supply("EKIPMAN", "DIS_ALIM", "Süt köpürtücü Sinbo yüksek devirli Sto-6727", "DIS_TEDARIKCI", 300),
  supply("EKIPMAN", "DIS_ALIM", "Lav 6'lı magnolia meşrubat bardağı", "DIS_TEDARIKCI", 310),
  supply("EKIPMAN", "DIS_ALIM", "Su tankı 75 lt", "DIS_TEDARIKCI", 320),

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
