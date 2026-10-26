"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, X } from "lucide-react";

import { updateLead } from "@/app/leads/actions";
import { Button } from "@/components/ui/button";
import { LEAD_CONCEPTS } from "@/lib/leads";
import type { LeadActionState } from "@/lib/validations/lead";

const initialState: LeadActionState = { success: false, message: "" };

type EditableAppointmentLead = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  city: string;
  source: string;
  requestedConcept: string;
  investmentBudget: string | null;
  description: string | null;
};

export function AppointmentLeadEditDialog({ lead }: { lead: EditableAppointmentLead }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateLead.bind(null, lead.id), initialState);
  const panelRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const conceptOptions = useMemo(() => Array.from(new Set([lead.requestedConcept, ...LEAD_CONCEPTS].filter(Boolean))), [lead.requestedConcept]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      panelRef.current?.scrollTo({ top: 0 });
      formRef.current?.querySelector<HTMLInputElement>('input[name="fullName"]')?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!state.success) return;

    const timer = setTimeout(() => setOpen(false), 650);
    return () => clearTimeout(timer);
  }, [state.success]);

  const dialog = open ? (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#17201b]/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex min-h-full items-start justify-center py-4 sm:py-6">
        <div ref={panelRef} className="flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-black/10 sm:max-h-[calc(100dvh-3rem)] md:max-w-3xl">
          <div className="flex shrink-0 items-center justify-between border-b bg-white px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold">Lead Bilgilerini Düzenle</h3>
              <p className="text-sm text-[#65705f]">Randevu öncesi yanlış girilen kişi bilgilerini güncelle.</p>
            </div>
            <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="min-h-0 overflow-y-auto">
            <form ref={formRef} action={action} className="grid gap-4 p-5 md:grid-cols-2">
              <input type="hidden" name="source" value={lead.source} />
              <Field name="fullName" label="Ad Soyad" defaultValue={lead.fullName} error={state.errors?.fullName} />
              <Field name="phone" label="Telefon" defaultValue={lead.phone} error={state.errors?.phone} />
              <Field name="email" label="E-posta" type="email" required={false} defaultValue={lead.email ?? ""} error={state.errors?.email} />
              <Field name="city" label="Şehir" defaultValue={lead.city} error={state.errors?.city} />
              <Field name="investmentBudget" label="Yatırım Bütçesi" required={false} defaultValue={lead.investmentBudget ?? ""} />
              <label className="grid gap-2">
                <span className="text-sm font-medium">Konsept</span>
                <select name="requestedConcept" defaultValue={lead.requestedConcept} className="h-10 rounded-lg border bg-[#f8faf6] px-3 text-sm">
                  {conceptOptions.map((concept) => (
                    <option key={concept} value={concept}>
                      {concept}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-medium">Açıklama / Not</span>
                <textarea name="description" defaultValue={lead.description ?? ""} rows={3} className="rounded-lg border bg-[#f8faf6] p-3 text-sm" />
              </label>

              {state.message ? (
                <p className={`rounded-lg p-3 text-sm md:col-span-2 ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {state.message}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 border-t pt-4 md:col-span-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Vazgeç</Button>
                <Button disabled={pending} className="bg-[#17201b] text-white">{pending ? "Kaydediliyor..." : "Kaydet"}</Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="size-4" />
        Düzenle
      </Button>
      {dialog && typeof document !== "undefined" ? createPortal(dialog, document.body) : null}
    </>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = true,
  defaultValue = "",
  error,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  error?: string[];
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <input required={required} name={name} type={type} defaultValue={defaultValue} className="h-10 rounded-lg border bg-[#f8faf6] px-3 text-sm" />
      {error?.[0] ? <span className="text-xs text-rose-700">{error[0]}</span> : null}
    </label>
  );
}
