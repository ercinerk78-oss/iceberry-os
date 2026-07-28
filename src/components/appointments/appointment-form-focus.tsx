"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function AppointmentFormFocus() {
  const searchParams = useSearchParams();
  const scheduleLead = searchParams.get("scheduleLead");

  useEffect(() => {
    if (!scheduleLead) return;

    const frame = window.requestAnimationFrame(() => {
      const formCard = document.getElementById("new-appointment");
      formCard?.scrollIntoView({ behavior: "smooth", block: "start" });

      const leadSelect = document.querySelector<HTMLSelectElement>('select[name="leadId"]');
      leadSelect?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [scheduleLead]);

  return null;
}
