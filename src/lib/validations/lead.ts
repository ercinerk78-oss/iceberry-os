import { z } from "zod";

import {
  INVALID_LEAD_REASONS,
  LEAD_ACTIVITY_TYPES,
  LEAD_CATEGORIES,
  LEAD_SOURCES,
  LEAD_STATUSES,
} from "@/lib/leads";

export const leadSchema = z.object({
  fullName: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalıdır."),
  phone: z.string().trim().min(10, "Geçerli bir telefon numarası girin."),
  email: z.string().trim().email("Geçerli bir e-posta adresi girin.").optional().or(z.literal("")),
  city: z.string().trim().min(2, "Şehir zorunludur."),
  source: z.enum(LEAD_SOURCES),
  requestedConcept: z.string().trim().min(2, "Konsept zorunludur."),
  investmentBudget: z.string().trim().max(250, "Yatırım bütçesi çok uzun.").optional().or(z.literal("")),
  description: z.string().trim().max(2000, "Açıklama çok uzun.").optional().or(z.literal("")),
});

export const leadStatusSchema = z.enum(LEAD_STATUSES);
export const leadCategorySchema = z.enum(LEAD_CATEGORIES);
export const invalidLeadReasonSchema = z.enum(INVALID_LEAD_REASONS);
export const leadCategoryChangeSchema = z.object({
  leadCategory: leadCategorySchema,
  invalidReason: invalidLeadReasonSchema.optional().or(z.literal("")),
  invalidReasonDetail: z.string().trim().max(500, "Açıklama çok uzun.").optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.leadCategory === "INVALID_FORM" && !data.invalidReason) {
    ctx.addIssue({ code: "custom", path: ["invalidReason"], message: "Hatalı Form için neden seçin." });
  }
  if (data.leadCategory === "INVALID_FORM" && data.invalidReason === "OTHER" && !data.invalidReasonDetail) {
    ctx.addIssue({ code: "custom", path: ["invalidReasonDetail"], message: "Diğer nedeni için açıklama yazın." });
  }
});

export const leadActivitySchema = z.object({
  type: z.enum(LEAD_ACTIVITY_TYPES),
  description: z.string().trim().min(2, "Aktivite açıklaması zorunludur."),
});

export type LeadActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  candidateId?: string;
};
