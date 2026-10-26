"use client";

import { useActionState, useEffect, useRef } from "react";

import { updateBranchRevenue } from "@/app/branch-revenues/actions";
import { Button } from "@/components/ui/button";
import { REVENUE_CURRENCIES, REVENUE_SOURCE_LABELS, REVENUE_SOURCES } from "@/lib/branch-revenue";
import type { BranchRevenueState } from "@/lib/validations/branch-revenue";

type BranchOption = {
  id: string;
  branchName: string;
};

type RevenueRecord = {
  id: string;
  branchId: string;
  year: number;
  month: number;
  grossRevenue: number;
  netRevenue: number | null;
  targetRevenue: number | null;
  transactionCount: number | null;
  averageTicket: number | null;
  currency: string;
  source: string;
  status: string;
  notes: string | null;
};

const initialState: BranchRevenueState = { success: false, message: "" };

export function BranchRevenueEditForm({ record, branches }: { record: RevenueRecord; branches: BranchOption[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(updateBranchRevenue.bind(null, record.id), initialState);
  const canSubmit = ["DRAFT", "REJECTED"].includes(record.status);

  useEffect(() => {
    if (state.success) formRef.current?.closest("details")?.removeAttribute("open");
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="mt-3 grid min-w-[360px] gap-2 rounded-lg border border-[#dfe4dc] bg-white p-3 shadow-sm">
      <Select name="branchId" current={record.branchId} options={branches.map((branch) => [branch.id, branch.branchName])} />
      <div className="grid grid-cols-2 gap-2">
        <input name="year" type="number" defaultValue={record.year} className="h-9 rounded-lg border px-3 text-sm" />
        <input name="month" type="number" min={1} max={12} defaultValue={record.month} className="h-9 rounded-lg border px-3 text-sm" />
      </div>
      <input name="grossRevenue" required type="number" min={0} step="0.01" defaultValue={record.grossRevenue} placeholder="Gerçekleşen ciro" className="h-9 rounded-lg border px-3 text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <input name="netRevenue" type="number" min={0} step="0.01" defaultValue={record.netRevenue ?? ""} placeholder="Net ciro" className="h-9 rounded-lg border px-3 text-sm" />
        <input name="targetRevenue" type="number" min={0} step="0.01" defaultValue={record.targetRevenue ?? ""} placeholder="Hedef" className="h-9 rounded-lg border px-3 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input name="transactionCount" type="number" min={0} defaultValue={record.transactionCount ?? ""} placeholder="İşlem" className="h-9 rounded-lg border px-3 text-sm" />
        <input name="averageTicket" type="number" min={0} step="0.01" defaultValue={record.averageTicket ?? ""} placeholder="Ortalama sepet" className="h-9 rounded-lg border px-3 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select name="currency" current={record.currency} options={REVENUE_CURRENCIES.map((item) => [item, item])} />
        <Select name="source" current={record.source} options={REVENUE_SOURCES.map((item) => [item, REVENUE_SOURCE_LABELS[item]])} />
      </div>
      <input name="supportFile" type="file" className="h-9 rounded-lg border px-3 py-1.5 text-sm" />
      <input name="notes" defaultValue={record.notes ?? ""} placeholder="Açıklama" className="h-9 rounded-lg border px-3 text-sm" />
      <textarea name="correctionReason" required minLength={5} rows={2} placeholder="Düzeltme nedeni" className="rounded-lg border px-3 py-2 text-sm" />
      {state.message ? (
        <p aria-live="polite" className={`rounded-lg p-2 text-xs ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {state.message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} size="sm">{pending ? "Kaydediliyor..." : "Düzeltmeyi Kaydet"}</Button>
        {canSubmit ? <Button name="submit" value="1" disabled={pending} size="sm" className="bg-[#17201b] text-white">{pending ? "Kaydediliyor..." : "Düzelt ve Onaya Gönder"}</Button> : null}
      </div>
    </form>
  );
}

function Select({ name, current, options }: { name: string; current: string | number; options: string[][] | readonly (readonly string[])[] }) {
  return (
    <select name={name} defaultValue={current} aria-label={name} className="h-9 rounded-lg border px-3 text-sm">
      {options.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
    </select>
  );
}
