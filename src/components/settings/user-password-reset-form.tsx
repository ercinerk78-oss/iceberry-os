"use client";

import { useActionState, useEffect, useRef } from "react";

import { resetPasswordWithState } from "@/app/settings/users/actions";
import { Button } from "@/components/ui/button";

const initialState = { success: false, message: "" };

export function UserPasswordResetForm({ userId }: { userId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(resetPasswordWithState.bind(null, userId), initialState);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={action} className="grid gap-2 sm:grid-cols-[minmax(180px,260px)_auto]">
      <input
        name="password"
        type="password"
        required
        minLength={10}
        placeholder="Yeni geçici şifre"
        className="h-9 rounded border px-2 text-sm"
      />
      <Button size="sm" variant="outline" disabled={pending}>
        {pending ? "Sıfırlanıyor..." : "Şifreyi Sıfırla"}
      </Button>
      {state.message ? (
        <p className={`sm:col-span-2 text-xs ${state.success ? "text-emerald-700" : "text-rose-700"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
