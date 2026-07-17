import { Prisma } from "@prisma/client";

import { monthPeriod } from "@/lib/branch-revenue";
import { prisma } from "@/lib/prisma";
import { BranchLedgerService } from "@/lib/finance/ledger-service";
import { decimal } from "@/lib/finance/money";

type Tx = Prisma.TransactionClient;

type RoyaltyCalculationInput = {
  branchId: string;
  year: number;
  month: number;
  createdById?: string;
};

type BulkRoyaltyInput = {
  year: number;
  month: number;
  createdById?: string;
};

const finalRevenueStatuses = ["APPROVED", "LOCKED"];

export class RoyaltyCalculationService {
  constructor(private readonly db: Tx | typeof prisma = prisma) {}

  async calculateMonthly(input: RoyaltyCalculationInput) {
    const { periodStart, periodEnd } = monthPeriod(input.year, input.month);
    const branch = await this.db.branch.findUnique({
      where: { id: input.branchId },
      include: { financialProfile: { include: { royaltyTiers: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } } } },
    });
    if (!branch) throw new Error("Şube bulunamadı.");
    if (branch.ownershipType !== "FRANCHISE") throw new Error("Şirket şubesinde royalty oluşturulamaz.");

    const profile = branch.financialProfile;
    if (!profile || !profile.isActive) throw new Error("Aktif finans profili bulunamadı.");
    if (profile.royaltyModel === "NONE") throw new Error("Bu şubede royalty uygulanmıyor.");
    if (profile.royaltyPeriod !== "MONTHLY") throw new Error("Bu hesaplayıcı yalnızca aylık royalty dönemini destekler.");
    if (this.isExempt(profile.royaltyExemptionStartDate, profile.royaltyExemptionEndDate, periodStart, periodEnd)) {
      throw new Error("Seçilen dönem royalty muafiyetinde.");
    }

    const existing = await this.db.royaltyAccrual.findUnique({
      where: {
        branchId_periodStart_periodEnd_royaltyModel: {
          branchId: branch.id,
          periodStart,
          periodEnd,
          royaltyModel: profile.royaltyModel,
        },
      },
    });
    if (existing) return existing;

    const revenueRecords = await this.db.branchRevenueRecord.findMany({
      where: {
        branchId: branch.id,
        periodType: "MONTHLY",
        periodStart,
        status: { in: finalRevenueStatuses },
      },
      select: { id: true, grossRevenue: true, netRevenue: true, currency: true, status: true },
    });
    if (!revenueRecords.length) throw new Error("Onaylı ciro kaydı bulunamadı.");
    if (revenueRecords.some((record) => record.currency !== profile.royaltyCurrency)) {
      throw new Error("Ciro para birimi royalty para birimiyle uyumlu değil.");
    }

    const revenueAmount = revenueRecords.reduce((sum, record) => {
      if (profile.royaltyCalculationBase === "NET_REVENUE" && record.netRevenue != null) return sum.plus(record.netRevenue);
      return sum.plus(record.grossRevenue);
    }, new Prisma.Decimal(0));
    const calculatedRoyalty = this.applyRoyaltyModel(profile, revenueAmount);
    const totalAmount = calculatedRoyalty;
    const dueDate = new Date(periodEnd);
    dueDate.setDate(Math.min(profile.royaltyDueDay, 28));
    dueDate.setMonth(dueDate.getMonth() + 1);

    const snapshot = {
      branchId: branch.id,
      branchName: branch.branchName,
      revenueRecordIds: revenueRecords.map((record) => record.id),
      revenueAmount: revenueAmount.toString(),
      royaltyModel: profile.royaltyModel,
      royaltyRate: profile.royaltyRate?.toString() ?? null,
      fixedRoyaltyAmount: profile.fixedRoyaltyAmount?.toString() ?? null,
      minimumRoyaltyAmount: profile.minimumRoyaltyAmount?.toString() ?? null,
      calculatedRoyalty: calculatedRoyalty.toString(),
    };

    const accrual = await this.db.royaltyAccrual.create({
      data: {
        branchId: branch.id,
        financialProfileId: profile.id,
        periodStart,
        periodEnd,
        dueDate,
        royaltyModel: profile.royaltyModel,
        calculationBase: profile.royaltyCalculationBase,
        revenueAmount,
        royaltyRate: profile.royaltyRate,
        fixedAmount: profile.fixedRoyaltyAmount,
        minimumAmount: profile.minimumRoyaltyAmount,
        calculatedRoyalty,
        totalAmount,
        outstandingAmount: totalAmount,
        currency: profile.royaltyCurrency,
        sourceRevenueRecordIds: JSON.stringify(revenueRecords.map((record) => record.id)),
        calculationSnapshot: JSON.stringify(snapshot),
        createdById: input.createdById,
      },
    });

    await this.db.financialActivityLog.create({
      data: {
        userId: input.createdById,
        branchId: branch.id,
        entityType: "RoyaltyAccrual",
        entityId: accrual.id,
        action: "ROYALTY_CALCULATED",
        amount: totalAmount,
        currency: profile.royaltyCurrency,
        description: `${branch.branchName} için ${input.year}/${String(input.month).padStart(2, "0")} royalty tahakkuku hesaplandı.`,
      },
    });

    return accrual;
  }

  async approveAccrual(accrualId: string, approvedById?: string) {
    return prisma.$transaction(async (tx) => {
      const accrual = await tx.royaltyAccrual.findUnique({
        where: { id: accrualId },
        include: { branch: true },
      });
      if (!accrual) throw new Error("Royalty tahakkuku bulunamadı.");
      if (accrual.status === "APPROVED" || accrual.status === "INVOICING_PENDING" || accrual.status === "INVOICED") return accrual;
      if (accrual.branch.ownershipType !== "FRANCHISE") throw new Error("Şirket şubesinde royalty onaylanamaz.");

      const updated = await tx.royaltyAccrual.update({
        where: { id: accrualId },
        data: { status: "APPROVED", approvedAt: new Date(), approvedById },
      });
      const ledger = new BranchLedgerService(tx);
      await ledger.createEntry({
        branchId: accrual.branchId,
        currency: accrual.currency,
        entryType: "ROYALTY_DEBIT",
        direction: "DEBIT",
        amount: accrual.totalAmount,
        dueDate: accrual.dueDate,
        referenceType: "RoyaltyAccrual",
        referenceId: accrual.id,
        royaltyAccrualId: accrual.id,
        description: "Onaylı royalty tahakkuku cari hesaba borç olarak yansıtıldı.",
        performedById: approvedById,
        approvedById,
      });
      await tx.notification.create({
        data: {
          role: "MUHASEBE",
          type: "ROYALTY_APPROVED",
          title: "Royalty onaylandı",
          message: `${accrual.branch.branchName} royalty tahakkuku cariye yansıtıldı.`,
          entityType: "RoyaltyAccrual",
          entityId: accrual.id,
        },
      });

      return updated;
    });
  }

  async calculateBulk(input: BulkRoyaltyInput) {
    const branches = await this.db.branch.findMany({
      where: { archivedAt: null, ownershipType: "FRANCHISE" },
      select: { id: true, branchName: true },
      orderBy: { branchName: "asc" },
    });

    const results: { branchId: string; branchName: string; status: string; message: string; accrualId?: string }[] = [];
    for (const branch of branches) {
      try {
        const accrual = await this.calculateMonthly({ branchId: branch.id, year: input.year, month: input.month, createdById: input.createdById });
        results.push({ branchId: branch.id, branchName: branch.branchName, status: "HESAPLANDI", message: "Royalty hesaplandı.", accrualId: accrual.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Royalty hesaplanamadı.";
        results.push({ branchId: branch.id, branchName: branch.branchName, status: "HATA", message });
      }
    }

    await this.db.financialActivityLog.create({
      data: {
        userId: input.createdById,
        entityType: "RoyaltyAccrual",
        action: "ROYALTY_CALCULATION_STARTED",
        description: `${input.year}/${String(input.month).padStart(2, "0")} toplu royalty hesaplama tamamlandı.`,
        newValue: JSON.stringify(results),
      },
    });

    return results;
  }

  private applyRoyaltyModel(profile: {
    royaltyModel: string;
    royaltyRate: Prisma.Decimal | null;
    fixedRoyaltyAmount: Prisma.Decimal | null;
    minimumRoyaltyAmount: Prisma.Decimal | null;
    royaltyTiers?: { minimumRevenue: Prisma.Decimal; maximumRevenue: Prisma.Decimal | null; royaltyRate: Prisma.Decimal; fixedAddition: Prisma.Decimal | null }[];
  }, revenueAmount: Prisma.Decimal) {
    const percentage = profile.royaltyRate ? revenueAmount.mul(profile.royaltyRate).div(100) : new Prisma.Decimal(0);
    const fixed = decimal(profile.fixedRoyaltyAmount);
    let calculated = percentage;

    if (profile.royaltyModel === "FIXED_AMOUNT") calculated = fixed;
    if (profile.royaltyModel === "GREATER_OF_FIXED_OR_PERCENTAGE") calculated = Prisma.Decimal.max(fixed, percentage);
    if (profile.royaltyModel === "LOWER_OF_FIXED_OR_PERCENTAGE") calculated = Prisma.Decimal.min(fixed, percentage);
    if (profile.royaltyModel === "HYBRID") calculated = fixed.plus(percentage);
    if (profile.royaltyModel === "TIERED_PERCENTAGE") calculated = this.calculateTieredRoyalty(profile.royaltyTiers ?? [], revenueAmount);
    if (profile.royaltyModel === "NONE") calculated = new Prisma.Decimal(0);
    if (profile.minimumRoyaltyAmount && calculated.lt(profile.minimumRoyaltyAmount)) calculated = profile.minimumRoyaltyAmount;

    return calculated.toDecimalPlaces(2);
  }

  private calculateTieredRoyalty(tiers: { minimumRevenue: Prisma.Decimal; maximumRevenue: Prisma.Decimal | null; royaltyRate: Prisma.Decimal; fixedAddition: Prisma.Decimal | null }[], revenueAmount: Prisma.Decimal) {
    const tier = tiers.find((item) => revenueAmount.gte(item.minimumRevenue) && (!item.maximumRevenue || revenueAmount.lte(item.maximumRevenue)));
    if (!tier) return new Prisma.Decimal(0);

    return revenueAmount.mul(tier.royaltyRate).div(100).plus(decimal(tier.fixedAddition)).toDecimalPlaces(2);
  }

  private isExempt(start: Date | null, end: Date | null, periodStart: Date, periodEnd: Date) {
    if (!start || !end) return false;
    return periodStart <= end && periodEnd >= start;
  }
}
