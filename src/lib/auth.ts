import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { hasPermissionWithOverrides, homeForRole, normalizePermissions, type Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createSessionToken, SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

const secret = () => process.env.AUTH_SECRET || "iceberry-development-secret-change-me";

export const currentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = await verifySessionToken(token, secret());
  if (!payload) return null;

  const user = await prisma.user.findFirst({
    where: { id: payload.userId, isActive: true, archivedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      roleRecord: { select: { permissions: true } },
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    permissions: normalizePermissions(user.roleRecord?.permissions ?? payload.permissions, user.role),
  };
});

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/api/auth/clear");
  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  if (!hasPermissionWithOverrides(user.role, permission, user.permissions)) {
    throw new Error("Bu işlemi yapma yetkiniz bulunmuyor.");
  }
  return user;
}

export async function setSession(user: { id: string; role: string; permissions?: Permission[] }, remember: boolean) {
  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
  const token = await createSessionToken(
    {
      userId: user.id,
      role: user.role,
      permissions: user.permissions,
      exp: Date.now() + maxAge * 1000,
    },
    secret(),
  );

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function audit(action: string, entityType: string, entityId: string | undefined, description: string, userId?: string) {
  const user = userId ? { id: userId } : await currentUser();
  const h = await headers();
  await prisma.auditLog.create({
    data: {
      userId: user?.id,
      action,
      entityType,
      entityId,
      description,
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip"),
    },
  });
}

export async function redirectHome(role: string) {
  redirect(homeForRole(role));
}
