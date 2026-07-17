import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type BranchRevenueRecordWithUser = Prisma.BranchRevenueRecordGetPayload<{
  include: { enteredBy: { select: { name: true } } };
}>;

export function isMissingRevenueTableError(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  const code = "code" in error ? error.code : undefined;
  const message = "message" in error && typeof error.message === "string" ? error.message : "";

  return code === "P2021" || code === "P2022" || message.includes("BranchRevenueRecord");
}

export async function safeFindBranchRevenueRecords(args: Prisma.BranchRevenueRecordFindManyArgs): Promise<BranchRevenueRecordWithUser[]> {
  try {
    return await prisma.branchRevenueRecord.findMany(args) as BranchRevenueRecordWithUser[];
  } catch (error) {
    if (isMissingRevenueTableError(error)) {
      console.warn("[branch-revenues] BranchRevenueRecord table is not available yet.");
      return [] as BranchRevenueRecordWithUser[];
    }

    throw error;
  }
}
