"use server";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/auth";
import { accessibleBranchIds } from "@/lib/branch-access";
import { saveDeliveryRoyalty } from "@/lib/finance/delivery-royalty-service";

export async function saveRoyaltyCalculation(raw: unknown) {
  const user = await requirePermission("finance");
  try {
    const result = await saveDeliveryRoyalty(raw, user.id, await accessibleBranchIds(user.id, user.role));
    revalidatePath("/branch-revenues/royalty");
    return { ok: true as const, ...result };
  } catch (error) {
    console.error("Delivery royalty calculation failed", error);
    const message = error instanceof ZodError ? error.issues[0]?.message : error instanceof Error && !("code" in error) ? error.message : "Hesaplama kaydedilemedi. Sayfayı yenileyip tekrar deneyin.";
    return { ok: false as const, message: message || "Hesaplama kaydedilemedi." };
  }
}
