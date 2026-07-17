"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireBranchFinanceAccess, requireCentralFinanceAccess } from "@/lib/finance/access";
import { CollectionPaymentService } from "@/lib/finance/payment-service";
import { BranchLedgerService } from "@/lib/finance/ledger-service";
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

const ledgerEntrySchema = z.object({
  branchId: z.string().min(1),
  direction: z.enum(["DEBIT", "CREDIT"]),
  entryType: z.string().min(1),
  amount: z.coerce.number().positive(),
  currency: z.string().min(3),
  transactionDate: z.string().min(1),
  dueDate: z.string().optional(),
  description: z.string().min(3),
  externalReferenceId: z.string().optional(),
});

const reconciliationSchema = z.object({
  branchId: z.string().min(1),
  currency: z.string().min(3),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  externalBalance: z.coerce.number().optional(),
  provider: z.string().optional(),
});

const disputeSchema = z.object({
  branchId: z.string().min(1),
  royaltyAccrualId: z.string().optional(),
  ledgerEntryId: z.string().optional(),
  invoiceId: z.string().optional(),
  disputeType: z.string().min(1),
  description: z.string().min(5),
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

export async function createManualLedgerEntry(_state: { message: string }, formData: FormData) {
  const user = await requireCentralFinanceAccess();
  const parsed = ledgerEntrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Manuel cari hareket bilgileri eksik veya hatalı." };
  const input = parsed.data;
  await requireBranchFinanceAccess(input.branchId);
  try {
    await new BranchLedgerService().createEntry({
      branchId: input.branchId,
      currency: input.currency,
      entryType: input.entryType,
      direction: input.direction,
      amount: input.amount,
      transactionDate: new Date(input.transactionDate),
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      referenceType: "ManualFinancialAdjustment",
      referenceId: `${input.branchId}-${input.externalReferenceId || Date.now()}`,
      description: input.description,
      sourceSystem: "ICEBERRY",
      externalReferenceId: input.externalReferenceId,
      performedById: user.id,
      approvedById: user.id,
    });
    await prisma.notification.create({
      data: {
        role: "MUHASEBE",
        type: "MANUAL_FINANCIAL_ADJUSTMENT_CREATED",
        title: "Manuel cari hareket oluşturuldu",
        message: input.description,
        entityType: "Branch",
        entityId: input.branchId,
      },
    });
    revalidatePath("/finance");
    return { message: "Manuel cari hareket oluşturuldu." };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Manuel cari hareket oluşturulamadı." };
  }
}

export async function reverseLedgerEntry(entryId: string) {
  const user = await requireCentralFinanceAccess();
  const entry = await prisma.branchLedgerEntry.findUnique({ where: { id: entryId }, select: { branchId: true } });
  if (!entry) throw new Error("Cari hareket bulunamadı.");
  await requireBranchFinanceAccess(entry.branchId);
  await new BranchLedgerService().reverseEntry(entryId, user.id);
  await prisma.financialActivityLog.create({
    data: {
      userId: user.id,
      branchId: entry.branchId,
      entityType: "BranchLedgerEntry",
      entityId: entryId,
      action: "LEDGER_ENTRY_REVERSED",
      description: "Cari hareket ters kayıtla düzeltildi.",
    },
  });
  revalidatePath("/finance");
}

export async function createReconciliation(_state: { message: string }, formData: FormData) {
  const user = await requireCentralFinanceAccess();
  const parsed = reconciliationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Mutabakat bilgileri eksik veya hatalı." };
  const input = parsed.data;
  await requireBranchFinanceAccess(input.branchId);
  const account = await prisma.branchLedgerAccount.findUnique({
    where: { branchId_currency: { branchId: input.branchId, currency: input.currency } },
  });
  if (!account) return { message: "Seçilen para birimi için cari hesap bulunamadı." };
  const externalBalance = input.externalBalance == null ? null : new Prisma.Decimal(input.externalBalance);
  const differenceAmount = externalBalance == null ? null : account.currentBalance.minus(externalBalance);
  const status = differenceAmount == null ? "PENDING" : differenceAmount.eq(0) ? "MATCHED" : "DIFFERENCE_FOUND";
  const reconciliation = await prisma.branchFinancialReconciliation.create({
    data: {
      branchId: input.branchId,
      ledgerAccountId: account.id,
      provider: input.provider || "ICEBERRY",
      periodStart: new Date(input.periodStart),
      periodEnd: new Date(input.periodEnd),
      internalBalance: account.currentBalance,
      externalBalance,
      differenceAmount,
      currency: input.currency,
      status,
      createdById: user.id,
      discrepancyDetails: status === "DIFFERENCE_FOUND" ? "Iceberry cari bakiyesi ile dış bakiye arasında fark var." : undefined,
    },
  });
  await prisma.financialActivityLog.create({
    data: {
      userId: user.id,
      branchId: input.branchId,
      entityType: "BranchFinancialReconciliation",
      entityId: reconciliation.id,
      action: "RECONCILIATION_CREATED",
      amount: account.currentBalance,
      currency: input.currency,
      description: "Şube cari mutabakat kaydı oluşturuldu.",
    },
  });
  revalidatePath("/finance");

  return { message: status === "MATCHED" ? "Mutabakat eşleşti." : "Mutabakat kaydı oluşturuldu." };
}

export async function createFinancialDispute(_state: { message: string }, formData: FormData) {
  const user = await requireBranchFinanceAccess(String(formData.get("branchId") ?? ""));
  const parsed = disputeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "İtiraz bilgileri eksik veya hatalı." };
  const input = parsed.data;
  const dispute = await prisma.financialDispute.create({
    data: {
      branchId: input.branchId,
      royaltyAccrualId: input.royaltyAccrualId || undefined,
      ledgerEntryId: input.ledgerEntryId || undefined,
      invoiceId: input.invoiceId || undefined,
      disputeType: input.disputeType,
      description: input.description,
      createdById: user.id,
      status: "OPEN",
    },
  });
  if (input.royaltyAccrualId) {
    await prisma.royaltyAccrual.update({ where: { id: input.royaltyAccrualId }, data: { status: "DISPUTED" } });
  }
  await prisma.notification.create({
    data: {
      role: "MUHASEBE",
      type: "FINANCIAL_DISPUTE_CREATED",
      title: "Finansal itiraz açıldı",
      message: input.description,
      entityType: "FinancialDispute",
      entityId: dispute.id,
    },
  });
  await prisma.financialActivityLog.create({
    data: {
      userId: user.id,
      branchId: input.branchId,
      entityType: "FinancialDispute",
      entityId: dispute.id,
      action: "FINANCIAL_DISPUTE_CREATED",
      description: input.description,
    },
  });
  revalidatePath("/finance");

  return { message: "Finansal itiraz kaydedildi." };
}
