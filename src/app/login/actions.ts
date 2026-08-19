"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { audit, clearSession, currentUser, setSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { homeForRole, normalizePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export type LoginState = { error: string };

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function login(_state: LoginState, fd: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { error: "E-posta veya şifre hatalı." };

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLocaleLowerCase("tr-TR") },
    include: { roleRecord: { select: { permissions: true } } },
  });

  if (!user || user.archivedAt || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "E-posta veya şifre hatalı." };
  }
  if (!user.isActive) return { error: "Kullanıcı hesabınız pasif durumda. Yöneticinizle görüşün." };

  const permissions = normalizePermissions(user.roleRecord?.permissions, user.role);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await setSession({ id: user.id, role: user.role, permissions }, fd.get("remember") === "on");
  await audit("LOGIN", "User", user.id, "Kullanıcı giriş yaptı.", user.id);
  redirect(homeForRole(user.role));
}

export async function logout() {
  const userCookie = await currentUser();
  if (userCookie) await audit("LOGOUT", "User", userCookie.id, "Kullanıcı çıkış yaptı.", userCookie.id);
  await clearSession();
  redirect("/login");
}
