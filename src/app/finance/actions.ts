"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireBranchFinanceAccess, requireCentralFinanceAccess } from "@/lib/finance/access";
import { CollectionPaymentService } from "@/lib/finance/payment-service";
import { RoyaltyCalculationService } from "@/lib/finance/royalty-service";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  branchId: z.string().min(1),
  royaltyModel: z.string().min(1),
  royaltyRate: z.coerce.number().min(0).optional(),
  fixedRoyaltyAmount: z.coerce.number().min(0).optional(),
  minimumRoyaltyAmount: z.coerce.number().min(0).optional(),
  royaltyCurrency: z.string().min(3),
  royaltyDueDay: z.coerce.number().int().min(1).max(28),
  paymentTermDays: z.coerce.number().int().min(0).max(120),
});

const periodSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  branchId: z.string().optional(),
});

const paymentSchema = z.object({
  branchId: z.string().min(1),
  amount: z.coerce.number().positive(),
  currency: z.string().min(3),
  paymentDate: z.string().min(1),
  paymentMethod: z.string().min(1),
  referenceNumber: z.string().optional(),
  description: z.string().optional(),
});

export async function saveFinancialProfile(_state: { message: string }, formData: FormData) {
  const user = await requireCentralFinanceAccess();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Finans profili bilgileri eksik veya hatalı." };
  const input = parsed.data;
  await requireBranchFinanceAccess(input.branchId);
  const branch = await prisma.branch.findUnique({ where: { id: input.branchId }, select: { ownershipType: true, branchName: true } });
  if (!branch) return { message: "Şube bulunamadı." };

  const royaltyModel = branch.ownershipType === "COMPANY_OWNED" ? "NONE" : input.royaltyModel;
  await prisma.branchFinancialProfile.upsert({
    where: { branchId: input.branchId },
    create: {
      branchId: input.branchId,
      royaltyModel,
      royaltyRate: input.royaltyRate == null ? undefined : new Prisma.Decimal(input.royaltyRate),
      fixedRoyaltyAmount: input.fixedRoyaltyAmount == null ? undefined : new Prisma.Decimal(input.fixedRoyaltyAmount),
      minimumRoyaltyAmount: input.minimumRoyaltyAmount == null ? undefined : new Prisma.Decimal(input.minimumRoyaltyAmount),
      royaltyCurrency: input.royaltyCurrency,
      defaultCurrency: input.royaltyCurrency,
      royaltyDueDay: input.royaltyDueDay,
      paymentTermDays: input.paymentTermDays,
      createdById: user.id,
      approvedById: user.id,
    },
    update: {
      royaltyModel,
      royaltyRate: input.royaltyRate == null ? null : new Prisma.Decimal(input.royaltyRate),
      fixedRoyaltyAmount: input.fixedRoyaltyAmount == null ? null : new Prisma.Decimal(input.fixedRoyaltyAmount),
      minimumRoyaltyAmount: input.minimumRoyaltyAmount == null ? null : new Prisma.Decimal(input.minimumRoyaltyAmount),
      royaltyCurrency: input.royaltyCurrency,
      defaultCurrency: input.royaltyCurrency,
      royaltyDueDay: input.royaltyDueDay,
      paymentTermDays: input.paymentTermDays,
      approvedById: user.id,
      isActive: true,
    },
  });
  await prisma.financialActivityLog.create({
    data: {
      userId: user.id,
      branchId: input.branchId,
      entityType: "BranchFinancialProfile",
      action: "BRANCH_FINANCIAL_PROFILE_UPDATED",
      description: `${branch.branchName} finans profili güncellendi.`,
    },
  });
  revalidatePath("/finance");

  return { message: "Finans profili kaydedildi." };
}

export async function calculateRoyalty(_state: { message: string }, formData: FormData) {
  const user = await requireCentralFinanceAccess();
  const parsed = periodSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Royalty dönemi hatalı." };
  const service = new RoyaltyCalculationService();
  try {
    if (parsed.data.branchId) {
      await requireBranchFinanceAccess(parsed.data.branchId);
      await service.calculateMonthly({ branchId: parsed.data.branchId, year: parsed.data.year, month: parsed.data.month, createdById: user.id });
      revalidatePath("/finance");
      return { message: "Royalty tahakkuku hesaplandı." };
    }
    const results = await service.calculateBulk({ year: parsed.data.year, month: parsed.data.month, createdById: user.id });
    revalidatePath("/finance");
    return { message: `Toplu hesaplama tamamlandı. Başarılı: ${results.filter((item) => item.status === "HESAPLANDI").length}, hata/uyarı: ${results.filter((item) => item.status !== "HESAPLANDI").length}.` };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Royalty hesaplanamadı." };
  }
}

export async function approveRoyalty(accrualId: string) {
  const user = await requireCentralFinanceAccess();
  await new RoyaltyCalculationService().approveAccrual(accrualId, user.id);
  revalidatePath("/finance");
}

export async function recordCollection(_state: { message: string }, formData: FormData) {
  const user = await requireCentralFinanceAccess();
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Tahsilat bilgileri eksik veya hatalı." };
  await requireBranchFinanceAccess(parsed.data.branchId);
  try {
    await new CollectionPaymentService().createAndAllocate({
      branchId: parsed.data.branchId,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      paymentDate: new Date(parsed.data.paymentDate),
      paymentMethod: parsed.data.paymentMethod,
      referenceNumber: parsed.data.referenceNumber,
      description: parsed.data.description,
      createdById: user.id,
    });
    revalidatePath("/finance");
    return { message: "Tahsilat kaydedildi ve açık borçlara dağıtıldı." };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Tahsilat kaydedilemedi." };
  }
}
