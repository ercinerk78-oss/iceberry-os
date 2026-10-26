"use client";

import { useActionState } from "react";

import { createUserWithState, type UserActionState } from "@/app/settings/users/actions";
import { Button } from "@/components/ui/button";

type RoleOption = {
  id: string;
  ad: string;
  kod: string;
};

type BranchOption = {
  id: string;
  label: string;
};

const inputClass = "h-10 rounded-lg border px-3";
const initialState: UserActionState = { success: false, message: "" };

export function UserCreateForm({ roles, branches }: { roles: RoleOption[]; branches: BranchOption[] }) {
  const [state, action, pending] = useActionState(createUserWithState, initialState);

  return (
    <form action={action} className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      <input name="name" placeholder="Ad Soyad" className={inputClass} required />
      <input name="email" type="email" placeholder="E-posta" className={inputClass} required />
      <input name="phone" placeholder="Telefon" className={inputClass} />
      <select name="role" className={inputClass} required>
        <option value="">Rol seçin</option>
        {roles.map((role) => (
          <option key={role.id} value={role.kod}>
            {role.ad}
          </option>
        ))}
      </select>
      <input name="password" type="password" placeholder="Geçici şifre - en az 10 karakter" className={inputClass} required />
      <label className="grid gap-1 text-xs text-[#65705f]">
        <span>Bağlı Şubeler</span>
        <select name="branchIds" multiple className="min-h-24 rounded-lg border px-3 py-2 text-sm text-[#17201b]">
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.label}
            </option>
          ))}
        </select>
      </label>
      {state.message ? (
        <p className={`rounded-lg p-3 text-sm md:col-span-2 xl:col-span-6 ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {state.message}
        </p>
      ) : null}
      <Button className="md:col-span-2 xl:col-span-6" disabled={pending}>
        {pending ? "Kullanıcı oluşturuluyor..." : "Kullanıcı Oluştur"}
      </Button>
    </form>
  );
}
