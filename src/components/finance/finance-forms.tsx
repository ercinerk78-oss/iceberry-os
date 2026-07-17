"use client";

import { useActionState } from "react";
import { Calculator, CreditCard, FileWarning, GitCompareArrows, Save, Scale } from "lucide-react";

import { calculateRoyalty, createFinancialDispute, createManualLedgerEntry, createReconciliation, recordCollection, saveFinancialProfile } from "@/app/finance/actions";
import { Button } from "@/components/ui/button";
import { FINANCE_CURRENCIES, FINANCIAL_DISPUTE_TYPES, LEDGER_ENTRY_TYPES, PAYMENT_METHOD_LABELS, PAYMENT_METHODS, ROYALTY_MODEL_LABELS, ROYALTY_MODELS } from "@/lib/finance/constants";

const initial = { message: "" };

type BranchOption = { id: string; branchName: string; ownershipType: string };

export function FinanceForms({ branches, year, month }: { branches: BranchOption[]; year: number; month: number }) {
  const [profileState, profileAction, profilePending] = useActionState(saveFinancialProfile, initial);
  const [royaltyState, royaltyAction, royaltyPending] = useActionState(calculateRoyalty, initial);
  const [paymentState, paymentAction, paymentPending] = useActionState(recordCollection, initial);
  const [entryState, entryAction, entryPending] = useActionState(createManualLedgerEntry, initial);
  const [reconciliationState, reconciliationAction, reconciliationPending] = useActionState(createReconciliation, initial);
  const [disputeState, disputeAction, disputePending] = useActionState(createFinancialDispute, initial);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="grid gap-4 xl:grid-cols-3">
      <form action={profileAction} className="rounded-lg border border-[#dfe4dc] bg-white p-4 shadow-none">
        <h3 className="flex items-center gap-2 font-semibold"><Save className="size-4" /> Finans Profili</h3>
        <div className="mt-4 grid gap-3">
          <Select name="branchId" label="Şube" options={branches.map((branch) => [branch.id, branch.branchName])} />
          <Select name="royaltyModel" label="Royalty modeli" options={ROYALTY_MODELS.map((item) => [item, ROYALTY_MODEL_LABELS[item]])} />
          <input name="royaltyRate" type="number" min={0} step="0.01" placeholder="Royalty oranı (%)" className="h-10 rounded-lg border px-3" />
          <input name="fixedRoyaltyAmount" type="number" min={0} step="0.01" placeholder="Sabit royalty" className="h-10 rounded-lg border px-3" />
          <input name="minimumRoyaltyAmount" type="number" min={0} step="0.01" placeholder="Minimum royalty" className="h-10 rounded-lg border px-3" />
          <Select name="royaltyCurrency" label="Para birimi" options={FINANCE_CURRENCIES.map((item) => [item, item])} />
          <input name="royaltyDueDay" type="number" min={1} max={28} defaultValue={15} className="h-10 rounded-lg border px-3" />
          <input name="paymentTermDays" type="number" min={0} max={120} defaultValue={15} className="h-10 rounded-lg border px-3" />
          <Button disabled={profilePending} className="bg-[#17201b] text-white">{profilePending ? "Kaydediliyor..." : "Profili Kaydet"}</Button>
          {profileState.message ? <p className="text-sm text-[#65705f]">{profileState.message}</p> : null}
        </div>
      </form>

      <form action={royaltyAction} className="rounded-lg border border-[#dfe4dc] bg-white p-4 shadow-none">
        <h3 className="flex items-center gap-2 font-semibold"><Calculator className="size-4" /> Royalty Hesaplama</h3>
        <div className="mt-4 grid gap-3">
          <input name="year" type="number" min={2020} defaultValue={year} className="h-10 rounded-lg border px-3" />
          <input name="month" type="number" min={1} max={12} defaultValue={month} className="h-10 rounded-lg border px-3" />
          <Select name="branchId" label="Şube seç veya toplu bırak" optional options={branches.map((branch) => [branch.id, branch.branchName])} />
          <Button disabled={royaltyPending} className="bg-[#17201b] text-white">{royaltyPending ? "Hesaplanıyor..." : "Royalty Hesapla"}</Button>
          {royaltyState.message ? <p className="text-sm text-[#65705f]">{royaltyState.message}</p> : null}
        </div>
      </form>

      <form action={paymentAction} className="rounded-lg border border-[#dfe4dc] bg-white p-4 shadow-none">
        <h3 className="flex items-center gap-2 font-semibold"><CreditCard className="size-4" /> Tahsilat</h3>
        <div className="mt-4 grid gap-3">
          <Select name="branchId" label="Şube" options={branches.map((branch) => [branch.id, branch.branchName])} />
          <input name="amount" type="number" min={0} step="0.01" placeholder="Tahsilat tutarı" className="h-10 rounded-lg border px-3" />
          <Select name="currency" label="Para birimi" options={FINANCE_CURRENCIES.map((item) => [item, item])} />
          <input name="paymentDate" type="date" defaultValue={today} className="h-10 rounded-lg border px-3" />
          <Select name="paymentMethod" label="Tahsilat yöntemi" options={PAYMENT_METHODS.map((item) => [item, PAYMENT_METHOD_LABELS[item]])} />
          <input name="referenceNumber" placeholder="Referans no" className="h-10 rounded-lg border px-3" />
          <input name="description" placeholder="Açıklama" className="h-10 rounded-lg border px-3" />
          <Button disabled={paymentPending} className="bg-[#17201b] text-white">{paymentPending ? "Kaydediliyor..." : "Tahsilatı Kaydet"}</Button>
          {paymentState.message ? <p className="text-sm text-[#65705f]">{paymentState.message}</p> : null}
        </div>
      </form>

      <form action={entryAction} className="rounded-lg border border-[#dfe4dc] bg-white p-4 shadow-none">
        <h3 className="flex items-center gap-2 font-semibold"><Scale className="size-4" /> Manuel Cari Hareket</h3>
        <div className="mt-4 grid gap-3">
          <Select name="branchId" label="Şube" options={branches.map((branch) => [branch.id, branch.branchName])} />
          <Select name="direction" label="Yön" options={[["DEBIT", "Borç"], ["CREDIT", "Alacak"]]} />
          <Select name="entryType" label="İşlem türü" options={LEDGER_ENTRY_TYPES.filter((item) => item.startsWith("MANUAL") || item.includes("FEE") || item.includes("CREDIT") || item === "PENALTY_DEBIT").map((item) => [item, item])} />
          <input name="amount" type="number" min={0} step="0.01" placeholder="Tutar" className="h-10 rounded-lg border px-3" />
          <Select name="currency" label="Para birimi" options={FINANCE_CURRENCIES.map((item) => [item, item])} />
          <input name="transactionDate" type="date" defaultValue={today} className="h-10 rounded-lg border px-3" />
          <input name="dueDate" type="date" className="h-10 rounded-lg border px-3" />
          <input name="externalReferenceId" placeholder="Referans" className="h-10 rounded-lg border px-3" />
          <input name="description" placeholder="Açıklama" className="h-10 rounded-lg border px-3" />
          <Button disabled={entryPending} className="bg-[#17201b] text-white">{entryPending ? "Kaydediliyor..." : "Hareket Oluştur"}</Button>
          {entryState.message ? <p className="text-sm text-[#65705f]">{entryState.message}</p> : null}
        </div>
      </form>

      <form action={reconciliationAction} className="rounded-lg border border-[#dfe4dc] bg-white p-4 shadow-none">
        <h3 className="flex items-center gap-2 font-semibold"><GitCompareArrows className="size-4" /> Cari Mutabakat</h3>
        <div className="mt-4 grid gap-3">
          <Select name="branchId" label="Şube" options={branches.map((branch) => [branch.id, branch.branchName])} />
          <Select name="currency" label="Para birimi" options={FINANCE_CURRENCIES.map((item) => [item, item])} />
          <input name="periodStart" type="date" defaultValue={today.slice(0, 8) + "01"} className="h-10 rounded-lg border px-3" />
          <input name="periodEnd" type="date" defaultValue={today} className="h-10 rounded-lg border px-3" />
          <input name="externalBalance" type="number" step="0.01" placeholder="Paraşüt / dış bakiye" className="h-10 rounded-lg border px-3" />
          <input name="provider" placeholder="Kaynak (PARASUT)" defaultValue="PARASUT" className="h-10 rounded-lg border px-3" />
          <Button disabled={reconciliationPending} className="bg-[#17201b] text-white">{reconciliationPending ? "Oluşturuluyor..." : "Mutabakat Oluştur"}</Button>
          {reconciliationState.message ? <p className="text-sm text-[#65705f]">{reconciliationState.message}</p> : null}
        </div>
      </form>

      <form action={disputeAction} className="rounded-lg border border-[#dfe4dc] bg-white p-4 shadow-none">
        <h3 className="flex items-center gap-2 font-semibold"><FileWarning className="size-4" /> Finansal İtiraz</h3>
        <div className="mt-4 grid gap-3">
          <Select name="branchId" label="Şube" options={branches.map((branch) => [branch.id, branch.branchName])} />
          <Select name="disputeType" label="İtiraz türü" options={FINANCIAL_DISPUTE_TYPES.map((item) => [item, item])} />
          <input name="royaltyAccrualId" placeholder="Royalty ID (opsiyonel)" className="h-10 rounded-lg border px-3" />
          <input name="ledgerEntryId" placeholder="Cari hareket ID (opsiyonel)" className="h-10 rounded-lg border px-3" />
          <input name="invoiceId" placeholder="Fatura ID (opsiyonel)" className="h-10 rounded-lg border px-3" />
          <textarea name="description" placeholder="İtiraz açıklaması" rows={3} className="rounded-lg border px-3 py-2" />
          <Button disabled={disputePending} className="bg-[#17201b] text-white">{disputePending ? "Kaydediliyor..." : "İtiraz Aç"}</Button>
          {disputeState.message ? <p className="text-sm text-[#65705f]">{disputeState.message}</p> : null}
        </div>
      </form>
    </section>
  );
}

function Select({ name, label, options, optional = false }: { name: string; label: string; options: string[][]; optional?: boolean }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <select name={name} className="h-10 rounded-lg border px-3">
        {optional ? <option value="">Tümü</option> : null}
        {options.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
      </select>
    </label>
  );
}
