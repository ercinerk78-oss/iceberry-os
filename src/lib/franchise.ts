export const FRANCHISEE_STATUSES={ACTIVE:"Aktif",SETUP:"Kurulum",ON_HOLD:"Beklemede",PASSIVE:"Pasif",TERMINATED:"Sona Erdi"} as const;
export const BRANCH_STATUSES={PLANNED:"Planlandı",SETUP:"Kurulum",ACTIVE:"Aktif",SEASONAL:"Sezonluk",PASSIVE:"Pasif",CLOSED:"Kapalı"} as const;
export const BRANCH_CONCEPTS={CORNER:"Corner",SELF:"Self",CAFE:"Cafe",HOTEL_KIOSK:"Hotel Kiosk"} as const;
export const LOCATION_TYPES={AVM:"AVM",STREET:"Cadde",UNIVERSITY:"Üniversite",HOTEL:"Otel",PETROL_STATION:"Akaryakıt İstasyonu",AIRPORT:"Havalimanı",OTHER:"Diğer"} as const;
export const label=(map:Record<string,string>,value:string)=>map[value]??value;
export const formatDate=(date:Date|string|null|undefined)=>date?new Intl.DateTimeFormat("tr-TR",{dateStyle:"medium"}).format(new Date(date)):"—";
export const formatRate=(rate:number|null|undefined)=>rate==null?"—":`%${rate.toLocaleString("tr-TR",{maximumFractionDigits:2})}`;
