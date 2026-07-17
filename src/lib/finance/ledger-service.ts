import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { decimal, nextNumber } from "@/lib/finance/money";

type Tx = Prisma.TransactionClient;

type LedgerEntryInput = {
  branchId: string;
  currency: string;
  entryType: string;
  direction: "DEBIT" | "CREDIT";
  amount: Prisma.Decimal.Value;
  transactionDate?: Date;
  dueDate?: Date | null;
  referenceType?: string;
  referenceId?: string;
  royaltyAccrualId?: string;
  orderId?: string;
  invoiceId?: string;
  paymentId?: string;
  description?: string;
  sourceSystem?: string;
  externalReferenceId?: string;
  performedById?: string;
  approvedById?: string;
};

export class BranchLedgerService {
  constructor(private readonly db: Tx | typeof prisma = prisma) {}

  async ensureAccount(branchId: string, currency = "TRY") {
    const existing = await this.db.branchLedgerAccount.findUnique({
      where: { branchId_currency: { branchId, currency } },
    });
    if (existing) return existing;

    return this.db.branchLedgerAccount.create({
      data: {
        branchId,
        currency,
        accountNumber: nextNumber(`CAR-${currency}`),
        currentBalance: new Prisma.Decimal(0),
      },
    });
  }

  async createEntry(input: LedgerEntryInput) {
    const account = await this.ensureAccount(input.branchId, input.currency);
    const amount = decimal(input.amount);
    if (amount.lte(0)) throw new Error("Cari hareket tutarı sıfırdan büyük olmalıdır.");

    const entry = await this.db.branchLedgerEntry.create({
      data: {
        ledgerAccountId: account.id,
        branchId: input.branchId,
        entryNumber: nextNumber(input.direction === "DEBIT" ? "BORC" : "ALACAK"),
        entryType: input.entryType,
        direction: input.direction,
        amount,
        currency: input.currency,
        baseCurrencyAmount: amount,
        transactionDate: input.transactionDate ?? new Date(),
        dueDate: input.dueDate ?? undefined,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        royaltyAccrualId: input.royaltyAccrualId,
        orderId: input.orderId,
        invoiceId: input.invoiceId,
        paymentId: input.paymentId,
        description: input.description,
        sourceSystem: input.sourceSystem ?? "ICEBERRY",
        externalReferenceId: input.externalReferenceId,
        performedById: input.performedById,
        approvedById: input.approvedById,
      },
    });
    const balanceChange = input.direction === "DEBIT" ? amount : amount.neg();

    await this.db.branchLedgerAccount.update({
      where: { id: account.id },
      data: {
        currentBalance: { increment: balanceChange },
        lastMovementAt: new Date(),
      },
    });

    await this.db.financialActivityLog.create({
      data: {
        userId: input.performedById,
        branchId: input.branchId,
        entityType: "BranchLedgerEntry",
        entityId: entry.id,
        action: input.direction === "DEBIT" ? "LEDGER_DEBIT_CREATED" : "LEDGER_CREDIT_CREATED",
        amount,
        currency: input.currency,
        description: input.description ?? `${input.entryType} cari hareketi oluşturuldu.`,
      },
    });

    return entry;
  }

  async reverseEntry(entryId: string, performedById?: string) {
    const entry = await this.db.branchLedgerEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new Error("Cari hareket bulunamadı.");
    if (entry.status === "REVERSED") return entry;

    const reverse = await this.createEntry({
      branchId: entry.branchId,
      currency: entry.currency,
      entryType: "REVERSAL",
      direction: entry.direction === "DEBIT" ? "CREDIT" : "DEBIT",
      amount: entry.amount,
      referenceType: "BranchLedgerEntry",
      referenceId: entry.id,
      description: `${entry.entryNumber} numaralı hareket için ters kayıt.`,
      sourceSystem: "ICEBERRY",
      performedById,
    });

    await this.db.branchLedgerEntry.update({
      where: { id: entry.id },
      data: { status: "REVERSED", reversedEntryId: reverse.id },
    });

    return reverse;
  }
}
