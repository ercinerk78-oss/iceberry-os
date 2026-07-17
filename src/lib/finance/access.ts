import type { Prisma } from "@prisma/client";

import { accessibleBranchIds, canAccessBranch, isBranchScopedRole } from "@/lib/branch-access";
import { requirePermission, requireUser } from "@/lib/auth";

const centralFinanceRoles = new Set(["GENERAL_MANAGER", "OPERATIONS_MANAGER", "MUHASEBE"]);

export async function requireFinanceUser() {
  return requirePermission("finance");
}

export async function financeBranchWhere(): Promise<Prisma.BranchWhereInput> {
  const user = await requireFinanceUser();
  if (!isBranchScopedRole(user.role)) return {};
  const branchIds = await accessibleBranchIds(user.id, user.role);

  return { id: { in: branchIds ?? [] } };
}

export async function requireBranchFinanceAccess(branchId: string) {
  const user = await requireFinanceUser();
  const allowed = await canAccessBranch(branchId);
  if (!allowed) throw new Error("Bu şubenin finans kayıtlarına erişim yetkiniz yok.");

  return user;
}

export async function requireCentralFinanceAccess() {
  const user = await requireUser();
  if (!centralFinanceRoles.has(user.role)) throw new Error("Bu finans işlemi için merkez finans yetkisi gerekiyor.");

  return user;
}

export function canManageFinance(role: string) {
  return role === "GENERAL_MANAGER" || role === "MUHASEBE";
}
