import { z } from "zod";

const optionalText = z.string().trim().max(1000, "Alan çok uzun.").optional().or(z.literal(""));
const optionalDate = z.string().optional().or(z.literal(""));

export const candidateSchema = z.object({
  fullName: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalıdır."),
  phone: z.string().trim().min(10, "Geçerli bir telefon numarası girin."),
  whatsapp: optionalText,
  email: z.string().trim().email("Geçerli bir e-posta adresi girin.").optional().or(z.literal("")),
  city: z.string().trim().min(2, "Şehir zorunludur."),
  district: optionalText,
  country: z.string().trim().min(2, "Ülke zorunludur."),
  investmentBudget: z.string().trim().min(1, "Yatırım bütçesi zorunludur."),
  currency: z.string().trim().min(3, "Para birimi zorunludur."),
  interestedConcept: z.string().trim().min(1, "Konsept seçin."),
  source: z.string().trim().min(1, "Kaynak seçin."),
  status: z.string().trim().min(1, "Durum seçin."),
  temperature: z.string().trim().min(1, "Sıcaklık seçin."),
  generalNotes: optionalText,
  nextFollowUpAt: optionalDate,
  lastContactAt: optionalDate,
  lostReason: optionalText,
  assignedUserId: optionalText,
});

export const interactionSchema = z.object({
  interactionType: z.string().trim().min(1, "Görüşme türü seçin."),
  title: z.string().trim().min(2, "Başlık en az 2 karakter olmalıdır."),
  description: z.string().trim().min(3, "Görüşme notu en az 3 karakter olmalıdır."),
  interactionDate: z.string().min(1, "Görüşme tarihi zorunludur."),
  nextAction: optionalText,
  reminderAt: optionalDate,
});

export type ActionState = { success: boolean; message: string; errors?: Record<string, string[]> };
