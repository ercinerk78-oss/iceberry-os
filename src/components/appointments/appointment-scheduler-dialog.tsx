"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarPlus, X } from "lucide-react";

import { createLeadAppointment } from "@/app/appointments/actions";
import { AppointmentSubmitButton } from "@/components/appointments/appointment-submit-button";
import { Button } from "@/components/ui/button";

type Option = [string, string];

type AppointmentSchedulerDialogProps = {
  leads: Option[];
  users: Option[];
  appointmentTypes: Option[];
  initialLeadId?: string;
  label?: string;
};

const initialState = { success: false, message: "" };

export function AppointmentSchedulerDialog({
  leads,
  users,
  appointmentTypes,
  initialLeadId = "",
  label = "Randevu Al",
}: AppointmentSchedulerDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createLeadAppointment, initialState);
  const panelRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      panelRef.current?.scrollTo({ top: 0 });
      formRef.current?.querySelector<HTMLSelectElement>('select[name="leadId"]')?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!state.success) return;

    formRef.current?.reset();
    const timer = setTimeout(() => setOpen(false), 650);
    return () => clearTimeout(timer);
  }, [state.success]);

  const dialog = open ? (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#17201b]/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex min-h-full items-start justify-center py-4 sm:py-6">
        <div ref={panelRef} className="flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-black/10 sm:max-h-[calc(100dvh-3rem)] md:max-w-4xl">
          <div className="flex shrink-0 items-center justify-between border-b bg-white px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold">Yeni Randevu Oluştur</h3>
              <p className="text-sm text-[#65705f]">Seçili lead için satış görüşmesi tarih ve saat aralığını gir.</p>
            </div>
            <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="min-h-0 overflow-y-auto">
            <form ref={formRef} action={action} className="grid gap-4 p-5 md:grid-cols-2">
              <Select name="leadId" label="Lead" current={initialLeadId} first="Lead seç" options={leads} required />
              <Field name="appointmentDate" label="Randevu tarihi" type="date" />
              <Field name="appointmentTime" label="Başlangıç saati" type="time" />
              <Field name="endTime" label="Bitiş saati" type="time" required={false} />
              <Select name="appointmentType" label="Görüşme tipi" options={appointmentTypes} required />
              <Select name="assignedUserId" label="Sorumlu" first="Sorumlu seç" options={users} />
              <Field name="title" label="Başlık" required={false} />
              <Field name="location" label="Lokasyon" required={false} />
              <Field name="meetingLink" label="Online görüşme linki" required={false} />
              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-medium">Randevu notu</span>
                <textarea name="notes" rows={3} className="rounded-lg border bg-[#f8faf6] p-3 text-sm" />
              </label>

              {state.message ? (
                <p className={`rounded-lg p-3 text-sm md:col-span-2 ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {state.message}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 border-t pt-4 md:col-span-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Vazgeç</Button>
                <AppointmentSubmitButton className="bg-[#17201b] text-white" pendingLabel="Oluşturuluyor...">
                  Randevu Oluştur
                </AppointmentSubmitButton>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <CalendarPlus className="size-4" />
        {label}
      </Button>
      {dialog && typeof document !== "undefined" ? createPortal(dialog, document.body) : null}
    </>
  );
}

function Field({ name, label, type = "text", required = true }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <input required={required} name={name} type={type} className="h-10 rounded-lg border bg-[#f8faf6] px-3 text-sm" />
    </label>
  );
}

function Select({
  name,
  label,
  current,
  first,
  options,
  required,
}: {
  name: string;
  label: string;
  current?: string;
  first?: string;
  options: Option[];
  required?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <select name={name} defaultValue={current ?? ""} required={required} className="h-10 rounded-lg border bg-[#f8faf6] px-3 text-sm">
        {first ? <option value="">{first}</option> : null}
        {options.map(([value, optionLabel]) => (
          <option key={value} value={value}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
