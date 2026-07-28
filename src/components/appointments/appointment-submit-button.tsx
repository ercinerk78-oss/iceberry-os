"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

type AppointmentSubmitButtonProps = ComponentProps<typeof Button> & {
  pendingLabel?: string;
};

export function AppointmentSubmitButton({
  children,
  pendingLabel = "Kaydediliyor...",
  disabled,
  ...props
}: AppointmentSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button {...props} disabled={disabled || pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
