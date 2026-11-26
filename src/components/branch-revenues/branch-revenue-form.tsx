"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { createBranchRevenue } from "@/app/branch-revenues/actions";
import { Button } from "@/components/ui/button";
import { REVENUE_CURRENCIES, REVENUE_SOURCE_LABELS, REVENUE_SOURCES } from "@/lib/branch-revenue";
import type { BranchRevenueState } from "@/lib/validations/branch-revenue";
import { RevenueAmountInput, RevenueBranchSearch, RevenuePeriodPicker } from "./revenue-entry-fields";

type BranchOption = {
  id: string;
  branchName: string;
};

type BranchRevenueFormProps = {
  branches: BranchOption[];
  year: number;
  month: number;
};

const initialState: BranchRevenueState = { success: false, message: "" };

export function BranchRevenueForm({ branches, year, month }: BranchRevenueFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [resetVersion, setResetVersion] = useState(0);
  const [state, formAction, pending] = useActionState(async (previous: BranchRevenueState, data: FormData) => {
    const result = await createBranchRevenue(previous, data);
    if (result.success) setResetVersion(version => version + 1);
    return result;
  }, initialState);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      <RevenueBranchSearch key={`branch-${resetVersion}`} branches={branches} />
      <RevenuePeriodPicker key={`period-${resetVersion}`} year={year} month={month} />
      <RevenueAmountInput key={`amount-${resetVersion}`} />
      <RevenueAmountInput key={`delivery-${resetVersion}`} name="deliveryRevenue" label="Paket Servis Cirosu" required={false} />
      <label className="block min-w-0 text-sm font-medium"><span className="mb-1 block">Ciro hedefi</span><input name="targetRevenue" type="number" min={0} step="0.01" className="h-10 w-full min-w-0 rounded-lg border px-3 font-normal" /></label>
      <Select name="currency" current="TRY" first="" options={REVENUE_CURRENCIES.map((item) => [item, item])} />
      <label className="block min-w-0 text-sm font-medium"><span className="mb-1 block">İşlem sayısı</span><input name="transactionCount" type="number" min={0} className="h-10 w-full min-w-0 rounded-lg border px-3 font-normal" /></label>
      <label className="block min-w-0 text-sm font-medium"><span className="mb-1 block">Ortalama sepet</span><input name="averageTicket" type="number" min={0} step="0.01" className="h-10 w-full min-w-0 rounded-lg border px-3 font-normal" /></label>
      <Select name="source" current="MANUAL" first="" options={REVENUE_SOURCES.map((item) => [item, REVENUE_SOURCE_LABELS[item]])} />
      <label className="block min-w-0 text-sm font-medium md:col-span-2"><span className="mb-1 block">Destekleyici dosya</span><input name="supportFile" type="file" className="h-10 w-full min-w-0 rounded-lg border px-3 py-2 text-sm font-normal" /></label>
      <label className="block min-w-0 text-sm font-medium xl:col-span-2"><span className="mb-1 block">Açıklama</span><input name="notes" className="h-10 w-full min-w-0 rounded-lg border px-3 font-normal" /></label>
      {state.message ? (
        <p aria-live="polite" className={`rounded-lg p-3 text-sm md:col-span-2 xl:col-span-6 ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {state.message}
        </p>
      ) : null}
      <div className="flex gap-2 md:col-span-2 xl:col-span-6">
        <Button name="submit" value="" disabled={pending}>{pending ? "Kaydediliyor..." : "Taslak Kaydet"}</Button>
        <Button name="submit" value="1" disabled={pending} className="bg-[#17201b] text-white">{pending ? "Kaydediliyor..." : "Onaya Gönder"}</Button>
      </div>
    </form>
  );
}

function Select({ name, current, first, options }: { name: string; current: string | number; first: string; options: string[][] }) {
  return (
    <label className="block min-w-0 text-sm font-medium"><span className="mb-1 block">{name === "currency" ? "Para birimi" : "Kaynak"}</span><select name={name} defaultValue={current} className="h-10 w-full min-w-0 rounded-lg border px-3 font-normal">
      {first ? <option value="">{first}</option> : null}
      {options.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
    </select></label>
  );
}
