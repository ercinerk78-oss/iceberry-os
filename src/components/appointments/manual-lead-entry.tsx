"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";

import { createManualLeadFromAppointments } from "@/app/appointments/actions";
import { Button } from "@/components/ui/button";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/appointments";
import { LEAD_CATEGORIES, LEAD_CATEGORY_LABELS, LEAD_CONCEPTS, LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/leads";
import type { LeadActionState } from "@/lib/validations/lead";

const initial: LeadActionState = { success: false, message: "" };

type UserOption = { id: string; name: string };

export function ManualLeadEntry({ users }: { users: UserOption[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className="bg-[#17201b] text-white">
        <Plus className="size-4" />
        Yeni Lead Ekle
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-[#17201b]/40 p-3 md:items-center md:justify-center">
          <div className="max-h-[92vh] w-full overflow-auto rounded-lg bg-white md:max-w-4xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold">Randevudan Yeni Lead Ekle</h3>
                <p className="text-sm text-[#65705f]">Telefonla veya manuel kanaldan gelen başvuruyu kaydet.</p>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <ManualLeadForm users={users} onCancel={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}

function ManualLeadForm({ users, onCancel }: { users: UserOption[]; onCancel: () => void }) {
  const [state, formAction, pending] = useActionState(createManualLeadFromAppointments, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const concepts = useMemo(() => [...LEAD_CONCEPTS], []);
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([concepts[0]]);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 p-5 md:grid-cols-2">
      <input type="hidden" name="requestedConcept" value={selectedConcepts[0] ?? concepts[0]} />
      <Section title="Lead Bilgileri" />
      <Field name="fullName" label="Ad Soyad" error={state.errors?.fullName} />
      <Field name="phone" label="Telefon" error={state.errors?.phone} />
      <Field name="email" label="E-posta" type="email" required={false} error={state.errors?.email} />
      <Field name="city" label="Şehir" error={state.errors?.city} />
      <input type="hidden" name="source" value="Manuel" />
      <Field name="investmentBudget" label="Yatırım Bütçesi" required={false} />
      <Select name="leadCategory" label="Lead Kategorisi" items={[["", "Kategori seç"], ...LEAD_CATEGORIES.map((item) => [item, LEAD_CATEGORY_LABELS[item]] as [string, string])]} />
      <Select name="leadStatus" label="Lead Durumu" items={LEAD_STATUSES.map((item) => [item, LEAD_STATUS_LABELS[item]] as [string, string])} />

      <fieldset className="grid gap-2 md:col-span-2">
        <legend className="text-sm font-medium">İlgilendiği Konseptler</legend>
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
                    event.target.checked ? Array.from(new Set([...current, concept])) : current.filter((item) => item !== concept),
                  );
                }}
                className="size-4 accent-[#17201b]"
              />
              {concept}
            </label>
          ))}
        </div>
      </fieldset>
      <Area name="description" label="Açıklama / Not" />

      <Section title="Randevu Bilgileri" />
      <Field name="appointmentDate" label="Randevu Tarihi" type="date" required={false} error={state.errors?.appointmentDate} />
      <Field name="appointmentTime" label="Randevu Saati" type="time" required={false} />
      <Field name="endTime" label="Bitiş Saati" type="time" required={false} />
      <Select name="appointmentType" label="Randevu Türü" items={[["", "Randevu türü seç"], ...Object.entries(APPOINTMENT_TYPE_LABELS)]} />
      <Select name="assignedUserId" label="Randevu Sorumlusu" items={[["", "Sorumlu seç"], ...users.map((user) => [user.name, user.name] as [string, string])]} />
      <Field name="title" label="Randevu Başlığı" required={false} />
      <Field name="location" label="Lokasyon" required={false} />
      <Field name="meetingLink" label="Online Görüşme Linki" required={false} />
      <Area name="appointmentNotes" label="Randevu Notu" />

      {state.message ? (
        <p className={`rounded-lg p-3 text-sm md:col-span-2 ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {state.message}
          {state.redirectHref ? (
            <Link className="ml-2 font-semibold underline" href={state.redirectHref}>
              {state.linkLabel ?? "Kaydı aç"}
            </Link>
          ) : null}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 border-t pt-4 md:col-span-2">
        <Button type="button" variant="outline" onClick={onCancel}>Vazgeç</Button>
        <Button disabled={pending} className="bg-[#17201b] text-white">{pending ? "Kaydediliyor..." : "Lead'i Kaydet"}</Button>
      </div>
    </form>
  );
}

function Section({ title }: { title: string }) {
  return <h4 className="border-b pb-2 text-sm font-semibold md:col-span-2">{title}</h4>;
}

function Field({ name, label, type = "text", required = true, error }: { name: string; label: string; type?: string; required?: boolean; error?: string[] }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <input required={required} name={name} type={type} className="h-10 rounded-lg border bg-[#f8faf6] px-3" />
      {error?.[0] ? <span className="text-xs text-rose-700">{error[0]}</span> : null}
    </label>
  );
}

function Area({ name, label }: { name: string; label: string }) {
  return (
    <label className="grid gap-2 md:col-span-2">
      <span className="text-sm font-medium">{label}</span>
      <textarea name={name} rows={3} className="rounded-lg border bg-[#f8faf6] p-3 text-sm" />
    </label>
  );
}

function Select({ name, label, items }: { name: string; label: string; items: [string, string][] }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <select name={name} className="h-10 rounded-lg border bg-white px-3">
        {items.map(([value, text]) => <option key={value || text} value={value}>{text}</option>)}
      </select>
    </label>
  );
}
