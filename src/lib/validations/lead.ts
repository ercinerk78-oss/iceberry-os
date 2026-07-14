import { z } from "zod";
import { LEAD_ACTIVITY_TYPES, LEAD_CONCEPTS, LEAD_SOURCES, LEAD_STATUSES } from "@/lib/leads";

export const leadSchema=z.object({
  fullName:z.string().trim().min(2,"Ad soyad en az 2 karakter olmalıdır."),
  phone:z.string().trim().min(10,"Geçerli bir telefon numarası girin."),
  email:z.string().trim().email("Geçerli bir e-posta adresi girin.").optional().or(z.literal("")),
  city:z.string().trim().min(2,"Şehir zorunludur."),
  source:z.enum(LEAD_SOURCES), requestedConcept:z.enum(LEAD_CONCEPTS),
});
export const leadStatusSchema=z.enum(LEAD_STATUSES);
export const leadActivitySchema=z.object({type:z.enum(LEAD_ACTIVITY_TYPES),description:z.string().trim().min(2,"Aktivite açıklaması zorunludur.")});
export type LeadActionState={success:boolean;message:string;errors?:Record<string,string[]>;candidateId?:string};
