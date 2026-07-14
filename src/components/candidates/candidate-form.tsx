"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { Candidate } from "@/types/candidate";
import type { ActionState } from "@/lib/validations/candidate";
import { PIPELINE_STAGES } from "@/lib/pipeline";

const initialState: ActionState = { success: false, message: "" };
const concepts = ["Kiosk", "Cadde Mağazası", "AVM", "Drive Thru", "Master Franchise"];
const temperatures = ["Soğuk", "Ilık", "Sıcak", "Çok Sıcak"];
const sources = ["Web Form", "Instagram", "Referans", "Fuar", "Saha Ekibi", "Diğer"];

export function CandidateForm({ action, candidate, onSuccess, onCancel }: { action: (state: ActionState, data: FormData) => Promise<ActionState>; candidate?: Candidate; onSuccess?: () => void; onCancel: () => void }) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.success) { formRef.current?.reset(); onSuccess?.(); } }, [state.success, onSuccess]);
  const dateInput = (value: string) => value ? value.slice(0, 16) : "";
  return (
    <form ref={formRef} action={formAction} className="grid gap-4 p-5 md:grid-cols-2">
      <Field name="fullName" label="Ad Soyad" required value={candidate?.fullName} error={state.errors?.fullName} />
      <Field name="phone" label="Telefon" required value={candidate?.phone} error={state.errors?.phone} />
      <Field name="whatsapp" label="WhatsApp" value={candidate?.whatsapp} />
      <Field name="email" label="E-posta" type="email" value={candidate?.email} error={state.errors?.email} />
      <Field name="city" label="Şehir" required value={candidate?.city} error={state.errors?.city} />
      <Field name="district" label="İlçe" value={candidate?.district} />
      <Field name="country" label="Ülke" required value={candidate?.country ?? "Türkiye"} />
      <Field name="investmentBudget" label="Yatırım Bütçesi" required value={candidate?.investmentBudget} error={state.errors?.investmentBudget} />
      <Select name="currency" label="Para Birimi" items={["TRY", "EUR", "USD"]} value={candidate?.currency ?? "TRY"} />
      <Select name="interestedConcept" label="Konsept" items={concepts} value={candidate?.interestedConcept} />
      <Select name="source" label="Kaynak" items={sources} value={candidate?.source} />
      <Select name="status" label="Durum" items={[...PIPELINE_STAGES]} value={candidate?.status} />
      <Select name="temperature" label="Sıcaklık" items={temperatures} value={candidate?.temperature} />
      <Field name="lastContactAt" label="Son Görüşme" type="datetime-local" value={dateInput(candidate?.lastContactAt ?? "")} />
      <Field name="nextFollowUpAt" label="Sonraki Takip" type="datetime-local" value={dateInput(candidate?.nextFollowUpAt ?? "")} />
      <Field name="lostReason" label="Kayıp Nedeni" value={candidate?.lostReason} />
      <Select name="assignedUserId" label="Sorumlu Kişi" items={["Ayşe Demir", "Caner Öz", "Dilan Kaya", "Murat Efe"]} value={candidate?.assignedUserId || "Ayşe Demir"} />
      <label className="grid gap-2 md:col-span-2"><span className="text-sm font-medium">Genel Notlar</span><textarea name="generalNotes" defaultValue={candidate?.generalNotes} rows={4} className="rounded-lg border border-[#d3d9cf] bg-[#f8faf6] px-3 py-2 text-sm outline-none focus:border-[#93d957]" /></label>
      {state.message && <p aria-live="polite" className={`md:col-span-2 rounded-lg p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{state.message}</p>}
      <div className="flex flex-col-reverse gap-2 border-t border-[#edf0e9] pt-4 md:col-span-2 md:flex-row md:justify-end"><Button type="button" variant="outline" onClick={onCancel}>Vazgeç</Button><Button disabled={pending} className="bg-[#17201b] text-white">{pending ? "Kaydediliyor..." : candidate ? "Değişiklikleri Kaydet" : "Adayı Kaydet"}</Button></div>
    </form>
  );
}

function Field({ name, label, value, type = "text", required, error }: { name: string; label: string; value?: string; type?: string; required?: boolean; error?: string[] }) { return <label className="grid gap-2"><span className="text-sm font-medium">{label}</span><input name={name} type={type} required={required} defaultValue={value} className="h-10 rounded-lg border border-[#d3d9cf] bg-[#f8faf6] px-3 text-sm outline-none focus:border-[#93d957]" />{error?.[0] && <span className="text-xs text-rose-700">{error[0]}</span>}</label>; }
function Select({ name, label, items, value }: { name: string; label: string; items: string[]; value?: string }) { return <label className="grid gap-2"><span className="text-sm font-medium">{label}</span><select name={name} defaultValue={value ?? items[0]} className="h-10 rounded-lg border border-[#d3d9cf] bg-[#f8faf6] px-3 text-sm">{items.map(item => <option key={item}>{item}</option>)}</select></label>; }
