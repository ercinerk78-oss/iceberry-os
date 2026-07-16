import type { Prisma } from "@prisma/client";

import { currentUser, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const scopedRoles = new Set(["BRANCH_OWNER", "BRANCH_MANAGER", "BRANCH_STAFF", "FRANCHISE_MANAGER"]);

export function isBranchScopedRole(role: string) {
  return scopedRoles.has(role);
}

export async function accessibleBranchIds(userId?: string, role?: string) {
  const user = userId && role ? { id: userId, role } : await requireUser();
  if (!isBranchScopedRole(user.role)) return null;

  const rows = await prisma.branchUser.findMany({
    where: { userId: user.id },
    select: { branchId: true },
  });

  return rows.map((row) => row.branchId);
}

export async function branchScopeWhere(): Promise<Prisma.BranchWhereInput> {
  const user = await currentUser();
  if (!user || !isBranchScopedRole(user.role)) return {};
  const ids = await accessibleBranchIds(user.id, user.role);

  return { id: { in: ids ?? [] } };
}

export async function canAccessBranch(branchId: string) {
  const user = await requireUser();
  const ids = await accessibleBranchIds(user.id, user.role);

  return ids === null || ids.includes(branchId);
}
