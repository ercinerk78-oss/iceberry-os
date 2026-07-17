"use client";

import { useActionState } from "react";
import Link from "next/link";

import { createOpeningProject, ensureOpeningTemplate } from "@/app/openings/actions";
import { Button } from "@/components/ui/button";
import type { OpeningState } from "@/lib/validations/opening";

const initial: OpeningState = { success: false, message: "" };

export function OpeningForm({
  branches,
  templates,
  users,
}: {
  branches: { id: string; branchName: string; city: string }[];
  templates: { id: string; name: string; version: number }[];
  users: { id: string; name: string; role: string }[];
}) {
  const [state, action, pending] = useActionState(createOpeningProject, initial);

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
      <label className="grid gap-2 text-sm font-medium">
        <span>Açılış Şablonu</span>
        <select name="templateId" className="h-10 rounded-lg border px-3">
          <option value="">Varsayılan yayımlanmış şablon</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} · v{template.version}
            </option>
          ))}
        </select>
      </label>
      <Field name="plannedStartDate" label="Planlanan Başlangıç" type="date" />
      <Field name="targetOpeningDate" label="Hedef Açılış Tarihi" type="date" required />
      <UserSelect name="projectManagerId" label="Proje Yöneticisi" users={users} />
      <UserSelect name="operationManagerId" label="Operasyon Sorumlusu" users={users} />
      <UserSelect name="architecturalLeadId" label="Mimari Sorumlu" users={users} />
      <UserSelect name="openingCoordinatorId" label="Açılış Koordinatörü" users={users} />
      <Field name="plannedBudget" label="Planlanan Bütçe" type="number" />
      <label className="grid gap-2 text-sm font-medium md:col-span-2">
        <span>Açıklama</span>
        <textarea name="description" rows={4} className="rounded-lg border p-3" />
      </label>
      {!templates.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 md:col-span-2">
          Yayımlanmış şablon bulunamazsa sistem varsayılan Iceberry şablonunu otomatik oluşturur.
          <button formAction={ensureOpeningTemplate} className="ml-2 font-semibold underline">
            Varsayılan şablonu hazırla
          </button>
        </div>
      ) : null}
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
        <Button disabled={pending}>{pending ? "Oluşturuluyor..." : "Gelişmiş Açılış Projesi Oluştur"}</Button>
      </div>
    </form>
  );
}

function Field({ name, label, type = "text", required = false }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      <input name={name} type={type} required={required} className="h-10 rounded-lg border px-3" />
    </label>
  );
}

function UserSelect({ name, label, users }: { name: string; label: string; users: { id: string; name: string; role: string }[] }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      <select name={name} className="h-10 rounded-lg border px-3">
        <option value="">Atanmadı</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} · {user.role}
          </option>
        ))}
      </select>
    </label>
  );
}
