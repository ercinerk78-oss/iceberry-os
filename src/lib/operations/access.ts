import type { Prisma } from "@prisma/client";

import { accessibleBranchIds, canAccessBranch, isBranchScopedRole } from "@/lib/branch-access";
import { requirePermission, requireUser } from "@/lib/auth";

const centralOperationRoles = new Set(["GENERAL_MANAGER", "OPERATIONS_MANAGER", "FRANCHISE_MANAGER"]);

export async function requireOperationsUser() {
  return requirePermission("operations");
}

export async function requireCentralOperationsAccess() {
  const user = await requireUser();
  if (!centralOperationRoles.has(user.role)) throw new Error("Bu işlem için merkez operasyon yetkisi gerekiyor.");
  return user;
}

export async function requireBranchOperationAccess(branchId: string) {
  const user = await requireOperationsUser();
  if (!(await canAccessBranch(branchId))) throw new Error("Bu şubenin operasyon kayıtlarına erişim yetkiniz yok.");
  return user;
}

export async function operationBranchWhere(): Promise<Prisma.BranchWhereInput> {
  const user = await requireOperationsUser();
  if (!isBranchScopedRole(user.role)) return {};
  const ids = await accessibleBranchIds(user.id, user.role);
  return { id: { in: ids ?? [] } };
}

export function canManageOperations(role: string) {
  return centralOperationRoles.has(role);
}
