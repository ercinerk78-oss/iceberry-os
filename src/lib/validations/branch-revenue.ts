import { z } from "zod";

import { REVENUE_CURRENCIES, REVENUE_SOURCES } from "@/lib/branch-revenue";

const optionalNumber = z.string().optional().or(z.literal("")).refine((value) => !value || Number(value) >= 0, "Negatif değer girilemez.");

export const branchRevenueSchema = z.object({
  branchId: z.string().min(1, "Şube seçmelisiniz."),
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  grossRevenue: z.coerce.number().nonnegative("Ciro negatif olamaz."),
  netRevenue: optionalNumber,
  targetRevenue: optionalNumber,
  transactionCount: optionalNumber,
  averageTicket: optionalNumber,
  currency: z.enum(REVENUE_CURRENCIES),
  source: z.enum(REVENUE_SOURCES),
  notes: z.string().trim().max(1000, "Açıklama en fazla 1000 karakter olabilir.").optional().or(z.literal("")),
  submit: z.string().optional(),
});

export const revenueRejectSchema = z.object({
  rejectionReason: z.string().trim().min(2, "Ret açıklaması zorunludur."),
});

export type BranchRevenueState = { success: boolean; message: string; id?: string };
