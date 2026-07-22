"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { createLead, updateLead } from "@/app/leads/actions";
import { Button } from "@/components/ui/button";
import { LEAD_CONCEPTS, LEAD_SOURCES, type LeadView } from "@/lib/leads";
import type { LeadActionState } from "@/lib/validations/lead";

const initial: LeadActionState = { success: false, message: "" };

type LeadFormProps = {
  lead?: LeadView;
  action?: (state: LeadActionState, data: FormData) => Promise<LeadActionState>;
  onSuccess: () => void;
  onCancel: () => void;
};

export function LeadForm({ lead, action, onSuccess, onCancel }: LeadFormProps) {
  const submitAction = action ?? (lead ? updateLead.bind(null, lead.id) : createLead);
  const [state, formAction, pending] = useActionState(submitAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const concepts = useMemo(() => uniqueValues([...LEAD_CONCEPTS, lead?.requestedConcept, ...(lead?.concepts.map((item) => item.name) ?? [])]), [lead]);
  const existingConcepts = lead?.concepts?.map((item) => item.name) ?? [];
  const [selectedConcepts, setSelectedConcepts] = useState(() => uniqueValues(existingConcepts.length ? existingConcepts : [lead?.requestedConcept ?? concepts[0]]));

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      const timer = setTimeout(onSuccess, 400);
      return () => clearTimeout(timer);
    }
  }, [state.success, onSuccess]);

  const requestedConcept = selectedConcepts[0] ?? concepts[0];

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 p-5 md:grid-cols-2">
      <input type="hidden" name="requestedConcept" value={requestedConcept} />
      <Field name="fullName" label="Ad Soyad" value={lead?.fullName} error={state.errors?.fullName} />
      <Field name="phone" label="Telefon" value={lead?.phone} error={state.errors?.phone} />
      <Field name="email" label="E-posta" type="email" required={false} value={lead?.email} error={state.errors?.email} />
      <Field name="city" label="Şehir" value={lead?.city} error={state.errors?.city} />
      <Select name="source" label="Kaynak" items={[...LEAD_SOURCES]} value={lead?.source} />
      <Field name="investmentBudget" label="Yatırım Bütçesi" required={false} value={lead?.investmentBudget} error={state.errors?.investmentBudget} />

      <fieldset className="grid gap-2 md:col-span-2">
        <legend className="text-sm font-medium">Talep Edilen Konseptler</legend>
        <div className="grid gap-2 rounded-lg border border-[#d3d9cf] bg-[#f8faf6] p-3 sm:grid-cols-3">
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
      </fieldset>

      <label className="grid gap-2 md:col-span-2">
        <span className="text-sm font-medium">Açıklama ve Form Cevapları</span>
        <textarea name="description" defaultValue={lead?.description} rows={4} className="rounded-lg border bg-[#f8faf6] p-3 text-sm" />
      </label>

      {state.message ? <p className={`md:col-span-2 rounded-lg p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{state.message}</p> : null}
      <div className="flex justify-end gap-2 border-t pt-4 md:col-span-2">
        <Button type="button" variant="outline" onClick={onCancel}>Vazgeç</Button>
        <Button type="submit" disabled={pending} className="bg-[#17201b] text-white">{pending ? "Kaydediliyor..." : lead ? "Lead'i Güncelle" : "Lead'i Kaydet"}</Button>
      </div>
    </form>
  );
}

function Field({ name, label, type = "text", value, error, required = true }: { name: string; label: string; type?: string; value?: string; error?: string[]; required?: boolean }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <input required={required} name={name} type={type} defaultValue={value} className="h-10 rounded-lg border bg-[#f8faf6] px-3" />
      {error?.[0] ? <span className="text-xs text-rose-700">{error[0]}</span> : null}
    </label>
  );
}

function Select({ name, label, items, value }: { name: string; label: string; items: string[]; value?: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <select name={name} defaultValue={value ?? items[0]} className="h-10 rounded-lg border bg-white px-3">
        {items.map((item) => <option key={item}>{item}</option>)}
      </select>
    </label>
  );
}

function uniqueValues(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, "tr"));
}
