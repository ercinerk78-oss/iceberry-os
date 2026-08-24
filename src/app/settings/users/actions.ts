"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit, requirePermission } from "@/lib/auth";
import { withNonHotelMainBranchWhere } from "@/lib/branch-visibility";
import { hashPassword } from "@/lib/password";
import { ALL_PERMISSIONS, type Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { userSchema } from "@/lib/validations/user";

const refreshUsers = () => revalidatePath("/settings/users");
export type UserActionState = { success: boolean; message: string };
type PasswordResetState = { success: boolean; message: string };
const branchScopedRoles = new Set(["BRANCH_OWNER", "BRANCH_MANAGER"]);

function branchIdsFromForm(formData: FormData) {
  return [...new Set(formData.getAll("branchIds").map(String).filter(Boolean))];
}

async function syncUserBranches(tx: Prisma.TransactionClient, userId: string, role: string, branchIds: string[]) {
  if (!branchScopedRoles.has(role)) {
    await tx.branchUser.deleteMany({ where: { userId } });
    return;
  }

  if (!branchIds.length) throw new Error("Bayi kullanıcısı için en az bir şube seçmelisiniz.");

  const validBranches = await tx.branch.findMany({
    where: withNonHotelMainBranchWhere({ id: { in: branchIds }, archivedAt: null }),
    select: { id: true },
  });
  const validIds = validBranches.map((branch) => branch.id);
  if (validIds.length !== branchIds.length) throw new Error("Seçilen şubelerden biri bulunamadı, arşivlenmiş veya Hotel konseptindedir.");

  await tx.branchUser.deleteMany({ where: { userId, branchId: { notIn: validIds } } });
  await tx.branchUser.createMany({
    data: validIds.map((branchId, index) => ({ userId, branchId, role, isPrimary: index === 0 })),
    skipDuplicates: true,
  });
  await tx.branchUser.updateMany({
    where: { userId, branchId: { in: validIds } },
    data: { role, isPrimary: false },
  });
  await tx.branchUser.update({
    where: { branchId_userId: { branchId: validIds[0], userId } },
    data: { isPrimary: true },
  });
}

export async function createUser(formData: FormData) {
  const actor = await requirePermission("users");
  const data = userSchema.parse(Object.fromEntries(formData));
  const branchIds = branchIdsFromForm(formData);

  if (!data.password) {
    throw new Error("Geçici şifre zorunludur.");
  }

  const role = await prisma.role.findUnique({ where: { kod: data.role } });
  if (!role) throw new Error("Seçilen rol sistemde bulunamadı. Rol listesini kontrol edin.");

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        role: data.role,
        roleId: role.id,
        passwordHash,
      },
    });
    await syncUserBranches(tx, created.id, data.role, branchIds);
    return created;
  });

  await audit("USER_CREATED", "User", user.id, `${user.email} kullanıcısı oluşturuldu.`, actor.id);
  refreshUsers();
  revalidatePath("/operations");
}

export async function createUserWithState(_state: UserActionState, formData: FormData): Promise<UserActionState> {
  try {
    await createUser(formData);
    return { success: true, message: "Kullanıcı başarıyla oluşturuldu." };
  } catch (error) {
    return { success: false, message: userErrorMessage(error, "Kullanıcı oluşturulamadı.") };
  }
}

export async function updateUser(id: string, formData: FormData) {
  const actor = await requirePermission("users");
  const before = await prisma.user.findUniqueOrThrow({ where: { id } });
  const data = userSchema.parse(Object.fromEntries(formData));
  const branchIds = branchIdsFromForm(formData);
  const role = await prisma.role.findUnique({ where: { kod: data.role } });
  if (!role) throw new Error("Seçilen rol sistemde bulunamadı. Rol listesini kontrol edin.");
  const passwordHash = data.password ? await hashPassword(data.password) : null;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        role: data.role,
        roleId: role.id,
        ...(passwordHash ? { passwordHash } : {}),
      },
    });
    await syncUserBranches(tx, id, data.role, branchIds);
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
  revalidatePath("/operations");
}

function userErrorMessage(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? fallback;
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "Bu e-posta adresiyle daha önce kullanıcı oluşturulmuş.";
  }
  if (error instanceof Error) return error.message;
  return fallback;
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

export async function resetPasswordWithState(id: string, _state: PasswordResetState, formData: FormData) {
  try {
    const password = String(formData.get("password") ?? "");

    if (password.length < 10) {
      return { success: false, message: "Şifre en az 10 karakter olmalıdır." };
    }

    await resetPassword(id, formData);
    return { success: true, message: "Şifre başarıyla sıfırlandı." };
  } catch (error) {
    console.error("Password reset failed", error);
    return { success: false, message: "Şifre sıfırlanamadı. Yetki veya kullanıcı durumunu kontrol edin." };
  }
}

export async function updateRolePermissions(roleId: string, formData: FormData) {
  const actor = await requirePermission("users");
  const role = await prisma.role.findUniqueOrThrow({ where: { id: roleId } });
  const selected = formData.getAll("permissions").map(String).filter((item): item is Permission => ALL_PERMISSIONS.includes(item as Permission));
  const unique = [...new Set(selected)];

  if (actor.role === role.kod && (!unique.includes("users") || !unique.includes("settings"))) {
    throw new Error("Kendi rolünüzden Ayarlar ve Kullanıcı Yönetimi yetkisini kaldıramazsınız.");
  }

  await prisma.role.update({
    where: { id: role.id },
    data: { permissions: unique },
  });

  await audit(
    "ROLE_PERMISSIONS_UPDATED",
    "Role",
    role.id,
    `${role.ad} rolünün yetkileri güncellendi.`,
    actor.id,
  );
  refreshUsers();
}
