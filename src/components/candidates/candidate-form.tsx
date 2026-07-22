"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { PIPELINE_STAGES } from "@/lib/pipeline";
import type { ActionState } from "@/lib/validations/candidate";
import type { Candidate } from "@/types/candidate";

const initialState: ActionState = { success: false, message: "" };
const defaultConcepts = ["Corner", "Cafe", "Self Cafe", "Kiosk", "Cadde Mağazası", "AVM", "Drive Thru", "Master Franchise"];
const temperatures = ["Soğuk", "Ilık", "Sıcak", "Çok Sıcak"];
const sources = ["Web Form", "Instagram", "Referans", "Fuar", "Saha Ekibi", "Diğer"];

type CandidateFormProps = {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  candidate?: Candidate;
  conceptOptions?: string[];
  tagOptions?: string[];
  onSuccess?: () => void;
  onCancel: () => void;
};

export function CandidateForm({ action, candidate, conceptOptions = [], tagOptions = [], onSuccess, onCancel }: CandidateFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const concepts = useMemo(() => uniqueValues([...conceptOptions, ...defaultConcepts, candidate?.interestedConcept]), [candidate?.interestedConcept, conceptOptions]);
  const existingConcepts = candidate?.concepts?.map((item) => item.name) ?? [];
  const [selectedConcepts, setSelectedConcepts] = useState(() => uniqueValues(existingConcepts.length ? existingConcepts : [candidate?.interestedConcept ?? concepts[0]]));

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      onSuccess?.();
    }
  }, [state.success, onSuccess]);

  const dateInput = (value: string) => (value ? value.slice(0, 16) : "");
  const selectedMainConcept = selectedConcepts[0] ?? concepts[0];
  const tagValue = candidate?.tags?.map((tag) => tag.name).join(", ") ?? "";

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 p-5 md:grid-cols-2">
      <input type="hidden" name="interestedConcept" value={selectedMainConcept} />
      <Field name="fullName" label="Ad Soyad" required value={candidate?.fullName} error={state.errors?.fullName} />
      <Field name="phone" label="Telefon" required value={candidate?.phone} error={state.errors?.phone} />
      <Field name="whatsapp" label="WhatsApp" value={candidate?.whatsapp} />
      <Field name="email" label="E-posta" type="email" value={candidate?.email} error={state.errors?.email} />
      <Field name="city" label="Şehir" required value={candidate?.city} error={state.errors?.city} />
      <Field name="district" label="İlçe" value={candidate?.district} />
      <Field name="country" label="Ülke" required value={candidate?.country ?? "Türkiye"} />
      <Field name="investmentBudget" label="Yatırım Bütçesi" required value={candidate?.investmentBudget} error={state.errors?.investmentBudget} />
      <Select name="currency" label="Para Birimi" items={["TRY", "EUR", "USD"]} value={candidate?.currency ?? "TRY"} />
      <Field name="qualificationScore" label="Aday Puanı (1-10)" type="number" value={candidate?.qualificationScore?.toString()} min={1} max={10} error={state.errors?.qualificationScore} />
      <Select name="source" label="Kaynak" items={sources} value={candidate?.source} />
      <Select name="status" label="Durum" items={[...PIPELINE_STAGES]} value={candidate?.status} />
      <Select name="temperature" label="Sıcaklık" items={temperatures} value={candidate?.temperature} />
      <Field name="lastContactAt" label="Son Görüşme" type="datetime-local" value={dateInput(candidate?.lastContactAt ?? "")} />
      <Field name="nextFollowUpAt" label="Sonraki Takip" type="datetime-local" value={dateInput(candidate?.nextFollowUpAt ?? "")} />
      <Field name="lostReason" label="Kayıp Nedeni" value={candidate?.lostReason} />
      <Select name="assignedUserId" label="Sorumlu Kişi" items={["Ayşe Demir", "Caner Öz", "Dilan Kaya", "Murat Efe"]} value={candidate?.assignedUserId || "Ayşe Demir"} />

      <fieldset className="grid gap-2 md:col-span-2">
        <legend className="text-sm font-medium">Yatırım Konseptleri</legend>
        <div className="grid gap-2 rounded-lg border border-[#d3d9cf] bg-[#f8faf6] p-3 sm:grid-cols-2 lg:grid-cols-4">
          {concepts.map((concept) => (
            <label key={concept} className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm">
              <input
                type="checkbox"
                name="concepts"
                value={concept}
                checked={selectedConcepts.includes(concept)}
                onChange={(event) => {
                  setSelectedConcepts((current) =>
                    event.target.checked
                      ? uniqueValues([...current, concept])
                      : current.filter((item) => item !== concept),
                  );
                }}
                className="size-4 accent-[#17201b]"
              />
              {concept}
            </label>
          ))}
        </div>
        <p className="text-xs text-[#65705f]">İlk seçilen konsept eski kayıtlarla uyumluluk için ana konsept olarak saklanır.</p>
      </fieldset>

      <label className="grid gap-2 md:col-span-2">
        <span className="text-sm font-medium">Etiketler</span>
        <input
          name="tags"
          defaultValue={tagValue}
          list={tagOptions.length ? "candidate-tag-options" : undefined}
          placeholder="Örn. yüksek bütçe, hızlı karar, İstanbul"
          className="h-10 rounded-lg border border-[#d3d9cf] bg-[#f8faf6] px-3 text-sm outline-none focus:border-[#93d957]"
        />
        {tagOptions.length ? (
          <datalist id="candidate-tag-options">
            {tagOptions.map((tag) => (
              <option key={tag} value={tag} />
            ))}
          </datalist>
        ) : null}
      </label>

      <label className="grid gap-2 md:col-span-2">
        <span className="text-sm font-medium">Genel Notlar</span>
        <textarea name="generalNotes" defaultValue={candidate?.generalNotes} rows={4} className="rounded-lg border border-[#d3d9cf] bg-[#f8faf6] px-3 py-2 text-sm outline-none focus:border-[#93d957]" />
      </label>
      {state.message ? <p aria-live="polite" className={`md:col-span-2 rounded-lg p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{state.message}</p> : null}
      <div className="flex flex-col-reverse gap-2 border-t border-[#edf0e9] pt-4 md:col-span-2 md:flex-row md:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Vazgeç</Button>
        <Button disabled={pending} className="bg-[#17201b] text-white">{pending ? "Kaydediliyor..." : candidate ? "Değişiklikleri Kaydet" : "Adayı Kaydet"}</Button>
      </div>
    </form>
  );
}

function Field({ name, label, value, type = "text", required, error, min, max }: { name: string; label: string; value?: string; type?: string; required?: boolean; error?: string[]; min?: number; max?: number }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <input name={name} type={type} required={required} defaultValue={value} min={min} max={max} className="h-10 rounded-lg border border-[#d3d9cf] bg-[#f8faf6] px-3 text-sm outline-none focus:border-[#93d957]" />
      {error?.[0] ? <span className="text-xs text-rose-700">{error[0]}</span> : null}
    </label>
  );
}

function Select({ name, label, items, value }: { name: string; label: string; items: string[]; value?: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <select name={name} defaultValue={value ?? items[0]} className="h-10 rounded-lg border border-[#d3d9cf] bg-[#f8faf6] px-3 text-sm">
        {items.map((item) => <option key={item}>{item}</option>)}
      </select>
    </label>
  );
}

function uniqueValues(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, "tr"));
}
