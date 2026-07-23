import { z } from "zod";

import { BRANCH_STATUSES, FRANCHISEE_STATUSES, LOCATION_TYPES } from "@/lib/franchise";

const optional = z.string().trim().optional().or(z.literal(""));
const date = optional.refine((value) => !value || !Number.isNaN(Date.parse(value)), "Geçerli bir tarih girin.");
const rate = optional.refine(
  (value) => !value || (!Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 100),
  "Oran 0 ile 100 arasında olmalıdır.",
);

export const franchiseeSchema = z.object({
  companyName: z.string().trim().min(2, "Şirket adı en az 2 karakter olmalıdır."),
  contactName: z.string().trim().min(2, "Yetkili kişi zorunludur."),
  phone: z.string().trim().min(10, "Geçerli bir telefon girin."),
  whatsapp: optional,
  email: optional.refine((value) => !value || z.email().safeParse(value).success, "Geçerli bir e-posta girin."),
  taxNumber: optional,
  taxOffice: optional,
  city: z.string().trim().min(2, "Şehir zorunludur."),
  district: optional,
  address: optional,
  status: z.enum(Object.keys(FRANCHISEE_STATUSES) as [keyof typeof FRANCHISEE_STATUSES, ...(keyof typeof FRANCHISEE_STATUSES)[]]),
  contractDate: date,
  contractStartDate: date,
  contractEndDate: date,
  defaultRoyaltyRate: rate,
  marketingContributionRate: rate,
  generalNotes: optional,
});

export const branchSchema = z.object({
  franchiseeId: optional,
  branchName: z.string().trim().min(2, "Şube adı zorunludur."),
  city: z.string().trim().min(2, "Şehir zorunludur."),
  district: optional,
  address: optional,
  conceptId: z.string().trim().min(1, "Konsept seçin."),
  concept: optional,
  locationType: z.enum(Object.keys(LOCATION_TYPES) as [keyof typeof LOCATION_TYPES, ...(keyof typeof LOCATION_TYPES)[]]),
  openingDate: date,
  plannedOpeningDate: date,
  royaltyRate: rate,
  marketingContributionRate: rate,
  operationsManager: optional,
  status: z.enum(Object.keys(BRANCH_STATUSES) as [keyof typeof BRANCH_STATUSES, ...(keyof typeof BRANCH_STATUSES)[]]),
  generalNotes: optional,
});

export type FormState = { success: boolean; message: string; id?: string };
