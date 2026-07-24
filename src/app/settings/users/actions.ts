"use server";

import { revalidatePath } from "next/cache";

import { audit, requirePermission } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { userSchema } from "@/lib/validations/user";

const refreshUsers = () => revalidatePath("/settings/users");

export async function createUser(formData: FormData) {
  const actor = await requirePermission("users");
  const data = userSchema.parse(Object.fromEntries(formData));

  if (!data.password) {
    throw new Error("Geçici şifre zorunludur.");
  }

  const role = await prisma.role.findUniqueOrThrow({ where: { kod: data.role } });
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      role: data.role,
      roleId: role.id,
      passwordHash: await hashPassword(data.password),
    },
  });

  await audit("USER_CREATED", "User", user.id, `${user.email} kullanıcısı oluşturuldu.`, actor.id);
  refreshUsers();
}

export async function updateUser(id: string, formData: FormData) {
  const actor = await requirePermission("users");
  const before = await prisma.user.findUniqueOrThrow({ where: { id } });
  const data = userSchema.parse(Object.fromEntries(formData));
  const role = await prisma.role.findUniqueOrThrow({ where: { kod: data.role } });

  await prisma.user.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      role: data.role,
      roleId: role.id,
      ...(data.password ? { passwordHash: await hashPassword(data.password) } : {}),
    },
  });

  await audit(
    before.role !== data.role ? "ROLE_CHANGED" : "USER_UPDATED",
    "User",
    id,
    before.role !== data.role
      ? `Rol ${before.role} değerinden ${data.role} değerine değiştirildi.`
      : "Kullanıcı bilgileri güncellendi.",
    actor.id,
  );
  refreshUsers();
}

export async function toggleUser(id: string, formData: FormData) {
  void formData;

  const actor = await requirePermission("users");
  const user = await prisma.user.findUniqueOrThrow({ where: { id } });

  if (user.id === actor.id) {
    throw new Error("Kendi hesabınızı pasifleştiremezsiniz.");
  }

  await prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
  await audit("USER_STATUS_CHANGED", "User", id, `Kullanıcı ${user.isActive ? "pasifleştirildi" : "aktifleştirildi"}.`, actor.id);
  refreshUsers();
}

export async function archiveUser(id: string, formData: FormData) {
  void formData;

  const actor = await requirePermission("users");

  if (id === actor.id) {
    throw new Error("Kendi hesabınızı arşivleyemezsiniz.");
  }

  await prisma.user.update({
    where: { id },
    data: { archivedAt: new Date(), isActive: false },
  });
  await audit("USER_ARCHIVED", "User", id, "Kullanıcı arşivlendi.", actor.id);
  refreshUsers();
}

export async function resetPassword(id: string, formData: FormData) {
  const actor = await requirePermission("users");
  const password = String(formData.get("password") ?? "");

  if (password.length < 10) {
    throw new Error("Şifre en az 10 karakter olmalıdır.");
  }

  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password) },
  });
  await audit("PASSWORD_RESET", "User", id, "Kullanıcı şifresi yönetici tarafından sıfırlandı.", actor.id);
  refreshUsers();
}
