export const LEAD_SOURCES = ["Instagram", "Facebook", "Web", "WhatsApp", "Manuel"] as const;
export const LEAD_CONCEPTS = ["Corner", "Cafe", "Self Cafe"] as const;
export const LEAD_STATUSES = ["Yeni", "Arandı", "Ulaşılamadı", "Randevu", "Lokasyon Bekleniyor", "Reddedildi", "Adaya Dönüştürüldü"] as const;
export const LEAD_ACTIVITY_TYPES = ["Telefon edildi", "WhatsApp gönderildi", "Not eklendi"] as const;

export type LeadView = {
  id:string; fullName:string; phone:string; email:string; city:string; source:string;
  requestedConcept:string; status:string; leadDate:string; convertedCandidateId:string;
  activities:{id:string;type:string;description:string;createdAt:string}[];
};

export function toLead(lead:{id:string;fullName:string;phone:string;email:string|null;city:string;source:string;requestedConcept:string;status:string;leadDate:Date;convertedCandidateId:string|null;activities:{id:string;type:string;description:string;createdAt:Date}[]}):LeadView{return{...lead,email:lead.email??"",convertedCandidateId:lead.convertedCandidateId??"",leadDate:lead.leadDate.toISOString(),activities:lead.activities.map(a=>({...a,createdAt:a.createdAt.toISOString()}))}}
