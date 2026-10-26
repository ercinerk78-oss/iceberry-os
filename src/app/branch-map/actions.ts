"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth";
import { branchScopeWhere } from "@/lib/branch-access";
import { geocodeAddress } from "@/lib/geocoding";
import { prisma } from "@/lib/prisma";

const BACKFILL_LIMIT = 5;
const MANUAL_REVIEW_LIMIT = 5;

export async function geocodeMissingBranchLocations() {
  await requirePermission("branches");
  const scope = await branchScopeWhere();
  const branches = await prisma.branch.findMany({
    where: {
      AND: [
        { archivedAt: null },
        { OR: [{ latitude: null }, { longitude: null }] },
        { city: { not: "" } },
        { OR: [{ address: { not: null } }, { district: { not: null } }] },
        scope,
      ],
    },
    select: { id: true, branchName: true, city: true, district: true, address: true },
    orderBy: { updatedAt: "asc" },
    take: BACKFILL_LIMIT,
  });

  let updated = 0;
  let failed = 0;
  const manualReview: string[] = [];

  for (const branch of branches) {
    const result = await geocodeAddress({ name: branch.branchName, address: branch.address, district: branch.district, city: branch.city });
    if (!result) {
      failed += 1;
      if (manualReview.length < MANUAL_REVIEW_LIMIT) manualReview.push(branch.branchName);
      continue;
    }

    await prisma.branch.update({
      where: { id: branch.id },
      data: { latitude: result.latitude, longitude: result.longitude },
    });
    updated += 1;
  }

  revalidatePath("/branch-map");
  revalidatePath("/branches");
  const params = new URLSearchParams({
    geocoded: String(updated),
    geocodeFailed: String(failed),
  });
  if (manualReview.length) params.set("manualReview", manualReview.join("|"));
  redirect(`/branch-map?${params.toString()}`);
}
