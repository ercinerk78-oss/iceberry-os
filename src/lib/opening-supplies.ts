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

  supply("ZUCCACIYE", "DIS_ALIM", "A.ARSLAN00000002 - 2500068279250 - Maşa şeker", "DIS_TEDARIKCI", 10),
  supply("ZUCCACIYE", "DIS_ALIM", "BİRADLI0155 - 8680211020688 - BRD502411 kaşık sos A.Büfe 17 cm", "DIS_TEDARIKCI", 20),
  supply("ZUCCACIYE", "DIS_ALIM", "ERC00000000000028 - 8003455100068 - UTL 006 konserve açacağı UTL006", "DIS_TEDARIKCI", 30),
  supply("ZUCCACIYE", "DIS_ALIM", "TURKAY00000001 - 3448436104973 - 25402 kesim panosu 25x40x2", "DIS_TEDARIKCI", 40),
  supply("ZUCCACIYE", "DIS_ALIM", "PİRGE0000174 - 38048 sebze bıçağı Ecco sivri 12 cm", "DIS_TEDARIKCI", 50),
  supply("ZUCCACIYE", "DIS_ALIM", "GASTROPLAST0027 - GPS 1000 sosluk fişek 1000 ml kırmızı", "DIS_TEDARIKCI", 60),
  supply("ZUCCACIYE", "DIS_ALIM", "GASTROPLAST0027 - GPS 1000 sosluk fişek 1000 ml sarı", "DIS_TEDARIKCI", 70),
  supply("ZUCCACIYE", "DIS_ALIM", "GASTROPLAST0027 - GPS 1000 sosluk fişek 1000 ml beyaz", "DIS_TEDARIKCI", 80),
  supply("ZUCCACIYE", "DIS_ALIM", "IRAK000000000028 - 8696219340727 - SA 305 saklama Hit Box No 2 3 lt", "DIS_TEDARIKCI", 90),
  supply("ZUCCACIYE", "DIS_ALIM", "IRAK000000000029 - 8696219340475 - SA 310 saklama Hit Box No 3 5 lt", "DIS_TEDARIKCI", 100),
  supply("ZUCCACIYE", "DIS_ALIM", "ASLAN00000000011 - 3448436104232 - Kepçe No 1", "DIS_TEDARIKCI", 110),
  supply("ZUCCACIYE", "DIS_ALIM", "EPİNOX0000000144 - EGB 30 çırpıcı çelik 30 cm", "DIS_TEDARIKCI", 120),
  supply("ZUCCACIYE", "DIS_ALIM", "BİRADLI0465 - BRD0425A spatula silikon yanmaz 25 cm", "DIS_TEDARIKCI", 130),
  supply("ZUCCACIYE", "DIS_ALIM", "EPİNOX0000000156 - KPB 9 pulbiberlik metal", "DIS_TEDARIKCI", 140),
  supply("ZUCCACIYE", "DIS_ALIM", "EPİNOX0000000046 - KPU 9 pudra şekeri serpici", "DIS_TEDARIKCI", 150),
  supply("ZUCCACIYE", "DIS_ALIM", "IRAK000000000136 - 8696219005282 - SU 125 sürahi oval prestij 2 lt", "DIS_TEDARIKCI", 160),
  supply("ZUCCACIYE", "DIS_ALIM", "153-GK04 - Gastroplast 4 bölmeli kaşıklık gri", "DIS_TEDARIKCI", 170),
  supply("ZUCCACIYE", "DIS_ALIM", "GASTROPLAST0196 - GMCP3 ölçü kabı PP şeffaf 3 lt", "DIS_TEDARIKCI", 180),
  supply("ZUCCACIYE", "DIS_ALIM", "UÇE000000000147 - Mayonez tenceresi 30 cm", "DIS_TEDARIKCI", 190),
  supply("ZUCCACIYE", "DIS_ALIM", "SİNERJİ000000116 - 8683301401206 - 40120 hamur kazıyıcı Chocolate", "DIS_TEDARIKCI", 200),
  supply("ZUCCACIYE", "DIS_ALIM", "BİRADLİ0550 - GRV KBS-01 plastik karton bardak standı 38,6x29,5x45", "DIS_TEDARIKCI", 210),
  supply("ZUCCACIYE", "DIS_ALIM", "BİRADLİ0446 - BRD-BC-6 bar pipet ve peçetelik", "DIS_TEDARIKCI", 220),
  supply("ZUCCACIYE", "DIS_ALIM", "EPİNOX0000000084 - Sipariş tutucu alüminyum 50 cm GST-50", "DIS_TEDARIKCI", 230),
  supply("ZUCCACIYE", "DIS_ALIM", "GASTROPLAST0054 - GNP-1965 küvet plastik 1/9 65 mm", "DIS_TEDARIKCI", 240),
  supply("ZUCCACIYE", "DIS_ALIM", "Pizza ruleti dilimleyicisi 10 cm", "DIS_TEDARIKCI", 250),
  supply("ZUCCACIYE", "DIS_ALIM", "109-RÇP001 - Real çelik peçetelik", "DIS_TEDARIKCI", 260),
  supply("ZUCCACIYE", "DIS_ALIM", "117-BRD190 - BRD ekonomik stick şekerlik 7xH6 cm", "DIS_TEDARIKCI", 270),
  supply("ZUCCACIYE", "DIS_ALIM", "Küllük metal tabanlı küçük 8 cm", "DIS_TEDARIKCI", 280),
  supply("ZUCCACIYE", "DIS_ALIM", "Küllük içi kapak küçük", "DIS_TEDARIKCI", 290),
  supply("ZUCCACIYE", "DIS_ALIM", "Yemek çatal çubuk", "DIS_TEDARIKCI", 300),
  supply("ZUCCACIYE", "DIS_ALIM", "Yemek bıçak çubuk Selvi Orkide 304", "DIS_TEDARIKCI", 310),
  supply("ZUCCACIYE", "DIS_ALIM", "Tatlı kaşık çubuk", "DIS_TEDARIKCI", 320),
  supply("ZUCCACIYE", "DIS_ALIM", "96942 - Çay seti Vefa bardak, tabak ve kaşık", "DIS_TEDARIKCI", 330),
  supply("ZUCCACIYE", "DIS_ALIM", "41536 - Bardak Allegra", "DIS_TEDARIKCI", 340),
  supply("ZUCCACIYE", "DIS_ALIM", "420202/6 - Bardak kahve yanı Allegra", "DIS_TEDARIKCI", 350),
  supply("ZUCCACIYE", "DIS_ALIM", "Sütlük Lux 0,5 lt kapaksız", "DIS_TEDARIKCI", 360),
  supply("ZUCCACIYE", "DIS_ALIM", "Sütlük Lux 0,7 lt kapaksız", "DIS_TEDARIKCI", 370),
  supply("ZUCCACIYE", "DIS_ALIM", "41099 - Ayaklı bardak", "DIS_TEDARIKCI", 380),
  supply("ZUCCACIYE", "DIS_ALIM", "BRD kokteyl kaşık 22 cm", "DIS_TEDARIKCI", 390),
  supply("ZUCCACIYE", "DIS_ALIM", "Ölçü kabı No:1 0,5 lt HU110", "DIS_TEDARIKCI", 400),
  supply("ZUCCACIYE", "DIS_ALIM", "Posa çekmecesi Vodinox siyah knock box 25x35x7 cm", "DIS_TEDARIKCI", 410),
  supply("ZUCCACIYE", "DIS_ALIM", "KAYALAR0000000149 - 152115050 küvet çelik 1/6 65", "DIS_TEDARIKCI", 420),
  supply("ZUCCACIYE", "DIS_ALIM", "Tepsi kaymaz 37x53 Lux fiberglass", "DIS_TEDARIKCI", 430),
  supply("ZUCCACIYE", "DIS_ALIM", "Tepsi kaymaz Q 40,5 yuvarlak fiberglass", "DIS_TEDARIKCI", 440),
  supply("ZUCCACIYE", "DIS_ALIM", "Kase Joker 6 cm ENT otel dekorsuz", "DIS_TEDARIKCI", 450),
  supply("ZUCCACIYE", "DIS_ALIM", "55141/2 - Bardak Irish Coffee 230 cc", "DIS_TEDARIKCI", 460),
  supply("ZUCCACIYE", "DIS_ALIM", "BYBONE00000000000000164 - Kupa konik Gleam 290 cc", "DIS_TEDARIKCI", 470),
  supply("ZUCCACIYE", "DIS_ALIM", "GURAL446 - Çay tabağı Karizma otel dekorsuz / filtre kahve altlığı", "DIS_TEDARIKCI", 480),
  supply("ZUCCACIYE", "DIS_ALIM", "BYBONE00000000000000018 - Kahve fincan takımı tabaklı Zest", "DIS_TEDARIKCI", 490),
  supply("ZUCCACIYE", "DIS_ALIM", "BYBONE00000000000000031 - Tabak çukur 21 cm Zest kırmızı", "DIS_TEDARIKCI", 500),
  supply("ZUCCACIYE", "DIS_ALIM", "153 701946 - Reçellik porselen", "DIS_TEDARIKCI", 510),
  supply("ZUCCACIYE", "DIS_ALIM", "Sütlük Helix Gleam 80 cc", "DIS_TEDARIKCI", 520),
  supply("ZUCCACIYE", "DIS_ALIM", "110-04POR002300 - Por. Soley beyaz sütlük 85 cc 372107", "DIS_TEDARIKCI", 530),
  supply("ZUCCACIYE", "DIS_ALIM", "Tabak sunum Akasya yuvarlak 25 cm AKS1062", "DIS_TEDARIKCI", 540),
  supply("ZUCCACIYE", "DIS_ALIM", "Porselen tabak", "DIS_TEDARIKCI", 550),
  supply("ZUCCACIYE", "DIS_ALIM", "Porselen fincan", "DIS_TEDARIKCI", 560),
  supply("ZUCCACIYE", "DIS_ALIM", "Üniforma", "DIS_TEDARIKCI", 570),
  supply("ZUCCACIYE", "DIS_ALIM", "Çöp kovası", "DIS_TEDARIKCI", 580),
  supply("ZUCCACIYE", "DIS_ALIM", "Çöp torbası", "DIS_TEDARIKCI", 590),
  supply("ZUCCACIYE", "DIS_ALIM", "Eldiven", "DIS_TEDARIKCI", 600),
  supply("ZUCCACIYE", "DIS_ALIM", "Bulaşık süngeri", "DIS_TEDARIKCI", 610),
  supply("ZUCCACIYE", "DIS_ALIM", "Bulaşık deterjanı", "DIS_TEDARIKCI", 620),
  supply("ZUCCACIYE", "DIS_ALIM", "Streç film gıda", "DIS_TEDARIKCI", 630),
  supply("ZUCCACIYE", "DIS_ALIM", "Rulo peçete 2'li ufak", "DIS_TEDARIKCI", 640),
  supply("ZUCCACIYE", "DIS_ALIM", "Temizlik bezi", "DIS_TEDARIKCI", 650),
  supply("ZUCCACIYE", "DIS_ALIM", "Süpürge faraş", "DIS_TEDARIKCI", 660),
  supply("ZUCCACIYE", "DIS_ALIM", "Mob aparatı, mob sopası ve mob bezi", "DIS_TEDARIKCI", 670),
  supply("ZUCCACIYE", "DIS_ALIM", "Tahta çay karıştırıcı", "DIS_TEDARIKCI", 680),
  supply("ZUCCACIYE", "DIS_ALIM", "Yağlı kağıt", "DIS_TEDARIKCI", 690),

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
