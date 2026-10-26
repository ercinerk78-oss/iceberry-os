"use client";

import { useActionState } from "react";

import { createBranchConcept, updateBranchConcept } from "@/app/settings/branch-concepts/actions";
import { Button } from "@/components/ui/button";
import { BRANCH_CONCEPT_ICONS, type BranchConceptOption } from "@/lib/branch-concepts";

type ConceptValues = BranchConceptOption & {
  minimumInvestment?: number | null;
  maximumInvestment?: number | null;
  averageAreaSqm?: number | null;
  averagePersonnel?: number | null;
  royaltyModel?: string | null;
};

const initial = { success: false, message: "" };

export function BranchConceptForm({ concept }: { concept?: ConceptValues }) {
  const action = concept ? updateBranchConcept.bind(null, concept.id) : createBranchConcept;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="grid gap-3 rounded-lg border border-[#dfe4dc] bg-white p-4 md:grid-cols-2 xl:grid-cols-4">
      <Field name="name" label="Konsept Adı" value={concept?.name} required />
      <Field name="code" label="Kod" value={concept?.code} placeholder="Örn. AIRPORT" />
      <Field name="slug" label="Slug" value={concept?.slug} placeholder="örn. airport" />
      <label className="grid gap-2 text-sm font-medium">
        <span>Durum</span>
        <span className="flex h-10 items-center gap-2 rounded-lg border bg-[#f8faf6] px-3">
          <input name="isActive" type="checkbox" defaultChecked={concept?.isActive ?? true} />
          Aktif
        </span>
      </label>
      <label className="grid gap-2 text-sm font-medium">
        <span>İkon</span>
        <select name="icon" defaultValue={concept?.icon ?? "Store"} className="h-10 rounded-lg border bg-[#f8faf6] px-3">
          {BRANCH_CONCEPT_ICONS.map((icon) => (
            <option key={icon} value={icon}>
              {icon}
            </option>
          ))}
        </select>
      </label>
      <Field name="color" label="Renk" type="color" value={concept?.color ?? "#2f5f20"} />
      <Field name="sortOrder" label="Sıralama" type="number" value={concept?.sortOrder ?? 0} />
      <Field name="royaltyModel" label="Royalty Modeli" value={concept?.royaltyModel} />
      <Field name="minimumInvestment" label="Minimum Yatırım" type="number" value={concept?.minimumInvestment} />
      <Field name="maximumInvestment" label="Maksimum Yatırım" type="number" value={concept?.maximumInvestment} />
      <Field name="averageAreaSqm" label="Ortalama m²" type="number" value={concept?.averageAreaSqm} />
      <Field name="averagePersonnel" label="Ortalama Personel" type="number" value={concept?.averagePersonnel} />
      <label className="grid gap-2 text-sm font-medium md:col-span-2 xl:col-span-4">
        <span>Açıklama</span>
        <textarea name="description" defaultValue={concept?.description ?? ""} rows={3} className="rounded-lg border bg-[#f8faf6] p-3" />
      </label>
      {state.message ? (
        <p className={`rounded-lg p-3 text-sm md:col-span-2 xl:col-span-4 ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {state.message}
        </p>
      ) : null}
      <div className="flex justify-end md:col-span-2 xl:col-span-4">
        <Button disabled={pending} className="bg-[#17201b] text-white">
          {pending ? "Kaydediliyor..." : concept ? "Konsepti Güncelle" : "Konsept Oluştur"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  value,
  type = "text",
  placeholder,
  required = false,
}: {
  name: string;
  label: string;
  value?: unknown;
  type?: string;
  placeholder?: string;
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
        defaultValue={type === "color" ? String(value ?? "#2f5f20") : String(value ?? "")}
        placeholder={placeholder}
        className="h-10 rounded-lg border bg-[#f8faf6] px-3"
      />
    </label>
  );
}
