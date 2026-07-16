export const FRANCHISEE_STATUSES={ACTIVE:"Aktif",SETUP:"Kurulum",ON_HOLD:"Beklemede",PASSIVE:"Pasif",TERMINATED:"Sona Erdi"} as const;
export const BRANCH_OWNERSHIP_TYPES={FRANCHISE:"Franchise",COMPANY_OWNED:"Merkez Şube"} as const;
export const BRANCH_STATUSES={PROSPECT:"Potansiyel",CONTRACTED:"Sözleşmeli",PLANNED:"Planlandı",IN_SETUP:"Kurulumda",READY_TO_OPEN:"Açılışa Hazır",ACTIVE:"Aktif",TEMPORARILY_CLOSED:"Geçici Kapalı",PASSIVE:"Pasif",SUSPENDED:"Askıda",CLOSED:"Kapalı",TRANSFERRED:"Devredildi",TERMINATED:"Sona Erdi"} as const;
export const BRANCH_CONCEPTS={CORNER:"Corner",SELF_CAFE:"Self Cafe",CAFE:"Cafe",HOTEL_KIOSK:"Hotel Kiosk"} as const;
export const LOCATION_TYPES={AVM:"AVM",STREET:"Cadde",UNIVERSITY:"Üniversite",HOTEL:"Otel",PETROL_STATION:"Akaryakıt İstasyonu",AIRPORT:"Havalimanı",OTHER:"Diğer"} as const;
export const label=(map:Record<string,string>,value:string)=>map[value]??value;
export const formatDate=(date:Date|string|null|undefined)=>date?new Intl.DateTimeFormat("tr-TR",{dateStyle:"medium"}).format(new Date(date)):"—";
export const formatRate=(rate:number|null|undefined)=>rate==null?"—":`%${rate.toLocaleString("tr-TR",{maximumFractionDigits:2})}`;
