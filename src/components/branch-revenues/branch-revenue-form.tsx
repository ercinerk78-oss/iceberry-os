"use client";

import { useActionState, useEffect, useRef } from "react";

import { createBranchRevenue } from "@/app/branch-revenues/actions";
import { Button } from "@/components/ui/button";
import { REVENUE_CURRENCIES, REVENUE_SOURCE_LABELS, REVENUE_SOURCES } from "@/lib/branch-revenue";
import type { BranchRevenueState } from "@/lib/validations/branch-revenue";

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
  const [state, formAction, pending] = useActionState(createBranchRevenue, initialState);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      <Select name="branchId" current="" first="Şube seç" options={branches.map((branch) => [branch.id, branch.branchName])} />
      <input name="year" type="number" defaultValue={year} className="h-10 rounded-lg border px-3" />
      <input name="month" type="number" min={1} max={12} defaultValue={month} className="h-10 rounded-lg border px-3" />
      <input name="grossRevenue" required type="number" min={0} step="0.01" placeholder="Gerçekleşen ciro" className="h-10 rounded-lg border px-3" />
      <input name="targetRevenue" type="number" min={0} step="0.01" placeholder="Ciro hedefi" className="h-10 rounded-lg border px-3" />
      <Select name="currency" current="TRY" first="" options={REVENUE_CURRENCIES.map((item) => [item, item])} />
      <input name="transactionCount" type="number" min={0} placeholder="İşlem sayısı" className="h-10 rounded-lg border px-3" />
      <input name="averageTicket" type="number" min={0} step="0.01" placeholder="Ortalama sepet" className="h-10 rounded-lg border px-3" />
      <Select name="source" current="MANUAL" first="" options={REVENUE_SOURCES.map((item) => [item, REVENUE_SOURCE_LABELS[item]])} />
      <input name="supportFile" type="file" className="h-10 rounded-lg border px-3 py-2 text-sm md:col-span-2" />
      <input name="notes" placeholder="Açıklama" className="h-10 rounded-lg border px-3 xl:col-span-2" />
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
    <select name={name} defaultValue={current} aria-label={name} className="h-10 rounded-lg border px-3">
      {first ? <option value="">{first}</option> : null}
      {options.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
    </select>
  );
}
