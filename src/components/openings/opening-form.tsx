"use client";

import { useActionState } from "react";
import Link from "next/link";

import { createOpening } from "@/app/openings/actions";
import { Button } from "@/components/ui/button";
import type { OpeningState } from "@/lib/validations/opening";

const initial: OpeningState = { success: false, message: "" };

export function OpeningForm({
  branches,
}: {
  branches: { id: string; branchName: string; city: string }[];
}) {
  const [state, action, pending] = useActionState(createOpening, initial);

  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-2 text-sm font-medium">
        <span>Şube</span>
        <select required name="branchId" className="h-10 rounded-lg border px-3">
          <option value="">Şube seçin</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.branchName} · {branch.city}
            </option>
          ))}
        </select>
      </label>
      <Field name="title" label="Proje Başlığı" required />
      <Field name="plannedStartDate" label="Planlanan Başlangıç" type="date" />
      <Field name="plannedOpeningDate" label="Planlanan Açılış" type="date" required />
      <Field name="projectManager" label="Proje Sorumlusu" />
      <label className="grid gap-2 text-sm font-medium md:col-span-2">
        <span>Not</span>
        <textarea name="generalNotes" rows={4} className="rounded-lg border p-3" />
      </label>
      {state.message ? (
        <p className={`rounded-lg p-3 text-sm md:col-span-2 ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {state.message}
          {state.id ? (
            <Link href={`/openings/${state.id}`} className="ml-2 font-semibold underline">
              Projeyi aç
            </Link>
          ) : null}
        </p>
      ) : null}
      <div className="flex justify-end gap-2 md:col-span-2">
        <Button asChild type="button" variant="outline">
          <Link href="/openings">Vazgeç</Link>
        </Button>
        <Button disabled={pending}>{pending ? "Oluşturuluyor..." : "Projeyi Oluştur"}</Button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      <input name={name} type={type} required={required} className="h-10 rounded-lg border px-3" />
    </label>
  );
}
