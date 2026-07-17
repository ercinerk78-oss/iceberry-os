"use client";

import { useActionState } from "react";

import { addOpeningBudgetItem, addOpeningRisk, changeOpeningTargetDate, updateReadinessCheck } from "@/app/openings/actions";
import { Button } from "@/components/ui/button";
import { openingRiskLevelLabels } from "@/lib/openings";
import type { OpeningState } from "@/lib/validations/opening";

const initial: OpeningState = { success: false, message: "" };
const input = "h-10 rounded-lg border bg-white px-3 text-sm";

export function BudgetForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(addOpeningBudgetItem.bind(null, projectId), initial);
  return (
    <form action={action} className="grid gap-3 rounded-lg border bg-[#f8faf6] p-4 md:grid-cols-3">
      <input name="category" required placeholder="Kategori" className={input} />
      <input name="title" required placeholder="Bütçe kalemi" className={input} />
      <input name="plannedAmount" required type="number" step="0.01" placeholder="Planlanan tutar" className={input} />
      <input name="approvedAmount" type="number" step="0.01" placeholder="Onaylanan tutar" className={input} />
      <input name="actualAmount" type="number" step="0.01" placeholder="Gerçekleşen tutar" className={input} />
      <select name="currency" defaultValue="TRY" className={input}><option value="TRY">TL</option><option value="EUR">EUR</option><option value="USD">USD</option></select>
      <input name="notes" placeholder="Not" className={`${input} md:col-span-2`} />
      <Button disabled={pending}>{pending ? "Ekleniyor..." : "Bütçe Kalemi Ekle"}</Button>
      {state.message ? <p className={`text-sm md:col-span-3 ${state.success ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
    </form>
  );
}

export function RiskForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(addOpeningRisk.bind(null, projectId), initial);
  return (
    <form action={action} className="grid gap-3 rounded-lg border bg-[#f8faf6] p-4 md:grid-cols-2">
      <input name="title" required placeholder="Risk başlığı" className={input} />
      <input name="category" required placeholder="Kategori" className={input} />
      <select name="level" defaultValue="MEDIUM" className={input}>{Object.entries(openingRiskLevelLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
      <input name="dueDate" type="date" className={input} />
      <textarea name="mitigationPlan" rows={3} placeholder="Azaltma planı" className="rounded-lg border bg-white p-3 text-sm md:col-span-2" />
      <Button disabled={pending} className="md:col-span-2">{pending ? "Kaydediliyor..." : "Risk Ekle"}</Button>
      {state.message ? <p className={`text-sm md:col-span-2 ${state.success ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
    </form>
  );
}

export function TargetDateForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(changeOpeningTargetDate.bind(null, projectId), initial);
  return (
    <form action={action} className="grid gap-3 rounded-lg border bg-[#f8faf6] p-4 md:grid-cols-[180px_1fr_auto]">
      <input name="newDate" required type="date" className={input} />
      <input name="reason" required placeholder="Değişiklik nedeni" className={input} />
      <Button disabled={pending}>{pending ? "Kaydediliyor..." : "Hedef Tarihi Güncelle"}</Button>
      {state.message ? <p className={`text-sm md:col-span-3 ${state.success ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
    </form>
  );
}

export function ReadinessCheckForm({ check }: { check: { id: string; status: string; score: number; notes: string | null } }) {
  return (
    <form action={updateReadinessCheck.bind(null, check.id)} className="grid gap-2 md:grid-cols-[160px_100px_1fr_auto]">
      <select name="status" defaultValue={check.status} className={input}>
        <option value="PENDING">Bekliyor</option>
        <option value="PASSED">Tamamlandı</option>
        <option value="FAILED">Eksik</option>
      </select>
      <input name="score" type="number" min="0" max="100" defaultValue={check.score} className={input} />
      <input name="notes" defaultValue={check.notes || ""} placeholder="Not" className={input} />
      <Button size="sm" variant="outline">Güncelle</Button>
    </form>
  );
}
