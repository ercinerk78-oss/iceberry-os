"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { BRANCH_CONCEPTS, BRANCH_STATUSES, LOCATION_TYPES } from "@/lib/franchise";
import type { FormState } from "@/lib/validations/franchise";

type Values = Record<string, unknown>;

const initial: FormState = { success: false, message: "" };

export function BranchForm({
  action,
  values = {},
  cancelHref,
}: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  values?: Values;
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      <Section title="Temel Bilgiler" />
      <Field name="branchName" label="Şube Adı" value={values.branchName} required />
      <Select name="concept" label="Konsept" value={String(values.concept ?? "CORNER")} options={BRANCH_CONCEPTS} />
      <Select name="locationType" label="Lokasyon Tipi" value={String(values.locationType ?? "STREET")} options={LOCATION_TYPES} />
      <Select name="status" label="Durum" value={String(values.status ?? "PLANNED")} options={BRANCH_STATUSES} />

      <Section title="Adres" />
      <Field name="city" label="Şehir" value={values.city} required />
      <Field name="district" label="İlçe" value={values.district} />
      <Area name="address" label="Adres" value={values.address} />

      <Section title="Operasyon" />
      <Field name="plannedOpeningDate" label="Planlanan Açılış" type="date" value={dateValue(values.plannedOpeningDate)} />
      <Field name="openingDate" label="Gerçek Açılış" type="date" value={dateValue(values.openingDate)} />
      <Field name="royaltyRate" label="Royalty Oranı (%)" type="number" value={values.royaltyRate} />
      <Field name="marketingContributionRate" label="Pazarlama Katkı Oranı (%)" type="number" value={values.marketingContributionRate} />
      <Field name="operationsManager" label="Operasyon Sorumlusu" value={values.operationsManager} />
      <Area name="generalNotes" label="Genel Notlar" value={values.generalNotes} />

      <input type="hidden" name="franchiseeId" value={String(values.franchiseeId ?? "")} />

      {state.message ? (
        <p className={`rounded-lg p-3 text-sm md:col-span-2 ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {state.message}
          {state.success && state.id ? (
            <Link className="ml-2 font-semibold underline" href={`/branches/${state.id}`}>
              Şube kaydını aç
            </Link>
          ) : null}
        </p>
      ) : null}
      <div className="flex justify-end gap-2 md:col-span-2">
        {cancelHref ? (
          <Button asChild type="button" variant="outline">
            <Link href={cancelHref}>Vazgeç</Link>
          </Button>
        ) : null}
        <Button disabled={pending} className="bg-[#17201b] text-white">
          {pending ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}

function Section({ title }: { title: string }) {
  return <h3 className="border-b pb-2 pt-2 font-semibold md:col-span-2">{title}</h3>;
}

function Field({
  name,
  label,
  type = "text",
  value,
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  value?: unknown;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      <input
        required={required}
        name={name}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? 0 : undefined}
        defaultValue={String(value ?? "")}
        className="h-10 rounded-lg border bg-[#f8faf6] px-3"
      />
    </label>
  );
}

function Area({ name, label, value }: { name: string; label: string; value?: unknown }) {
  return (
    <label className="grid gap-2 text-sm font-medium md:col-span-2">
      <span>{label}</span>
      <textarea name={name} defaultValue={String(value ?? "")} rows={3} className="rounded-lg border bg-[#f8faf6] p-3" />
    </label>
  );
}

function Select({ name, label, value, options }: { name: string; label: string; value: string; options: Record<string, string> }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      <select name={name} defaultValue={value} className="h-10 rounded-lg border bg-[#f8faf6] px-3">
        {Object.entries(options).map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function dateValue(value: unknown) {
  return value ? new Date(String(value)).toISOString().slice(0, 10) : "";
}
