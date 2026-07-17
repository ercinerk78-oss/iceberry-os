"use client";

import { useActionState } from "react";
import { Calculator, CreditCard, Save } from "lucide-react";

import { calculateRoyalty, recordCollection, saveFinancialProfile } from "@/app/finance/actions";
import { Button } from "@/components/ui/button";
import { FINANCE_CURRENCIES, PAYMENT_METHOD_LABELS, PAYMENT_METHODS, ROYALTY_MODEL_LABELS, ROYALTY_MODELS } from "@/lib/finance/constants";

const initial = { message: "" };

type BranchOption = { id: string; branchName: string; ownershipType: string };

export function FinanceForms({ branches, year, month }: { branches: BranchOption[]; year: number; month: number }) {
  const [profileState, profileAction, profilePending] = useActionState(saveFinancialProfile, initial);
  const [royaltyState, royaltyAction, royaltyPending] = useActionState(calculateRoyalty, initial);
  const [paymentState, paymentAction, paymentPending] = useActionState(recordCollection, initial);

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
          <input name="paymentDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="h-10 rounded-lg border px-3" />
          <Select name="paymentMethod" label="Tahsilat yöntemi" options={PAYMENT_METHODS.map((item) => [item, PAYMENT_METHOD_LABELS[item]])} />
          <input name="referenceNumber" placeholder="Referans no" className="h-10 rounded-lg border px-3" />
          <input name="description" placeholder="Açıklama" className="h-10 rounded-lg border px-3" />
          <Button disabled={paymentPending} className="bg-[#17201b] text-white">{paymentPending ? "Kaydediliyor..." : "Tahsilatı Kaydet"}</Button>
          {paymentState.message ? <p className="text-sm text-[#65705f]">{paymentState.message}</p> : null}
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
