"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { openCandidateFromCompletedAppointment, type AppointmentActionState } from "@/app/appointments/actions";
import { AppointmentSubmitButton } from "@/components/appointments/appointment-submit-button";

const initialState: AppointmentActionState = { success: false, message: "" };

export function AppointmentCompleteDialog({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [state, action] = useActionState(openCandidateFromCompletedAppointment.bind(null, appointmentId), initialState);

  useEffect(() => {
    if (state.success && state.redirectHref) router.push(state.redirectHref);
  }, [router, state.redirectHref, state.success]);

  return (
    <form action={action} className="grid gap-2">
      <AppointmentSubmitButton size="sm" pendingLabel="Aday açılıyor...">
        <CheckCircle2 className="size-4" />
        Görüşüldü
      </AppointmentSubmitButton>
      {state.message && !state.success ? <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{state.message}</p> : null}
    </form>
  );
}
