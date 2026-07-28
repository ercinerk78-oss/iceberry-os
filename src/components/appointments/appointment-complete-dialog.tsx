"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

import { completeLeadAppointment } from "@/app/appointments/actions";
import { AppointmentSubmitButton } from "@/components/appointments/appointment-submit-button";
import { Button } from "@/components/ui/button";
import { LEAD_CATEGORY_LABELS } from "@/lib/leads";

const initialState = { success: false, message: "" };

export function AppointmentCompleteDialog({ appointmentId }: { appointmentId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(completeLeadAppointment.bind(null, appointmentId), initialState);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => dialogRef.current?.scrollTo({ top: 0 }));

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!state.success) return;

    const timer = setTimeout(() => setOpen(false), 700);
    return () => clearTimeout(timer);
  }, [state.success]);

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <CheckCircle2 className="size-4" />
        Görüşüldü
      </Button>
      {open ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#17201b]/45 p-3 backdrop-blur-sm sm:p-4">
          <div className="flex min-h-full items-start justify-center py-4 sm:py-6">
            <div ref={dialogRef} className="flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-black/10 md:max-w-2xl">
              <div className="flex shrink-0 items-center justify-between border-b px-5 py-4">
                <div>
                  <h3 className="text-lg font-semibold">Görüşme Bilgileri</h3>
                  <p className="text-sm text-[#65705f]">Randevu sonucunu, notları ve sonraki aksiyonu kaydet.</p>
                </div>
                <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)}>
                  <X className="size-4" />
                </Button>
              </div>
              <form action={action} className="grid gap-3 overflow-y-auto p-5">
                <label className="grid gap-2 text-sm font-medium">
                  <span>Görüşme notu</span>
                  <textarea name="notes" rows={4} className="rounded-lg border bg-[#f8faf6] p-3 text-sm" />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  <span>Görüşme sonucu</span>
                  <input name="outcome" required className="h-10 rounded-lg border bg-[#f8faf6] px-3 text-sm" />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  <span>Lead kategorisi</span>
                  <select name="leadCategory" className="h-10 rounded-lg border bg-[#f8faf6] px-3 text-sm">
                    <option value="">Kategori seç</option>
                    {Object.entries(LEAD_CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  <span>Sonraki aksiyon</span>
                  <input name="nextAction" className="h-10 rounded-lg border bg-[#f8faf6] px-3 text-sm" />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  <span>Sonraki takip zamanı</span>
                  <input name="nextFollowUpAt" type="datetime-local" className="h-10 rounded-lg border bg-[#f8faf6] px-3 text-sm" />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input name="convertToCandidate" value="1" type="checkbox" className="size-4" />
                  Franchise adayına dönüştür
                </label>
                {state.message ? (
                  <p className={`rounded-lg p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {state.message}
                  </p>
                ) : null}
                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Vazgeç
                  </Button>
                  <AppointmentSubmitButton className="bg-[#17201b] text-white">Kaydet</AppointmentSubmitButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
