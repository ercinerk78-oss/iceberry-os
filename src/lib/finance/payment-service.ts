import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { BranchLedgerService } from "@/lib/finance/ledger-service";
import { decimal, nextNumber } from "@/lib/finance/money";

type PaymentInput = {
  branchId: string;
  amount: Prisma.Decimal.Value;
  currency?: string;
  paymentDate?: Date;
  valueDate?: Date;
  paymentMethod?: string;
  referenceNumber?: string;
  description?: string;
  createdById?: string;
};

export class CollectionPaymentService {
  async createAndAllocate(input: PaymentInput) {
    const amount = decimal(input.amount);
    if (amount.lte(0)) throw new Error("Tahsilat tutarı sıfırdan büyük olmalıdır.");

    return prisma.$transaction(async (tx) => {
      const ledger = new BranchLedgerService(tx);
      const account = await ledger.ensureAccount(input.branchId, input.currency ?? "TRY");
      const payment = await tx.collectionPayment.create({
        data: {
          paymentNumber: nextNumber("TAH"),
          branchId: input.branchId,
          ledgerAccountId: account.id,
          amount,
          currency: input.currency ?? "TRY",
          baseCurrencyAmount: amount,
          paymentDate: input.paymentDate ?? new Date(),
          valueDate: input.valueDate ?? input.paymentDate ?? new Date(),
          paymentMethod: input.paymentMethod ?? "BANK_TRANSFER",
          referenceNumber: input.referenceNumber,
          description: input.description,
          status: "APPROVED",
          unappliedAmount: amount,
          createdById: input.createdById,
          approvedById: input.createdById,
          approvedAt: new Date(),
        },
      });
      await ledger.createEntry({
        branchId: input.branchId,
        currency: input.currency ?? "TRY",
        entryType: "PAYMENT_CREDIT",
        direction: "CREDIT",
        amount,
        paymentId: payment.id,
        referenceType: "CollectionPayment",
        referenceId: payment.id,
        description: input.description ?? "Tahsilat cari hesaba alacak olarak işlendi.",
        performedById: input.createdById,
        approvedById: input.createdById,
      });

      const openAccruals = await tx.royaltyAccrual.findMany({
        where: {
          branchId: input.branchId,
          currency: input.currency ?? "TRY",
          status: { in: ["APPROVED", "INVOICING_PENDING", "INVOICED", "PARTIALLY_PAID", "OVERDUE"] },
          outstandingAmount: { gt: new Prisma.Decimal(0) },
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      });

      let remaining = amount;
      for (const accrual of openAccruals) {
        if (remaining.lte(0)) break;
        const outstanding = decimal(accrual.outstandingAmount);
        const allocated = Prisma.Decimal.min(remaining, outstanding);
        if (allocated.lte(0)) continue;
        const newPaidAmount = decimal(accrual.paidAmount).plus(allocated);
        const newOutstanding = outstanding.minus(allocated);
        const newStatus = newOutstanding.lte(0) ? "PAID" : "PARTIALLY_PAID";

        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            royaltyAccrualId: accrual.id,
            allocatedAmount: allocated,
            currency: payment.currency,
            createdById: input.createdById,
          },
        });
        await tx.royaltyAccrual.update({
          where: { id: accrual.id },
          data: {
            paidAmount: newPaidAmount,
            outstandingAmount: newOutstanding,
            status: newStatus,
          },
        });
        remaining = remaining.minus(allocated);
      }

      const paymentStatus = remaining.eq(amount) ? "APPROVED" : remaining.gt(0) ? "PARTIALLY_APPLIED" : "FULLY_APPLIED";
      const updated = await tx.collectionPayment.update({
        where: { id: payment.id },
        data: { unappliedAmount: remaining, status: paymentStatus },
      });
      await tx.notification.create({
        data: {
          role: "MUHASEBE",
          type: remaining.gt(0) ? "PAYMENT_UNALLOCATED" : "PAYMENT_RECEIVED",
          title: "Tahsilat kaydedildi",
          message: remaining.gt(0) ? "Tahsilatın dağıtılmamış avans bakiyesi var." : "Tahsilat açık borçlara dağıtıldı.",
          entityType: "CollectionPayment",
          entityId: payment.id,
        },
      });

      return updated;
    });
  }
}
