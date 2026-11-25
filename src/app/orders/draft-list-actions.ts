"use server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/auth";
import { DraftConflict } from "@/lib/order-draft-service";
import { runDraftListCommand } from "@/lib/order-draft-list-service";

export async function draftListCommand(raw: unknown) {
  const user = await requirePermission("orders");
  await requirePermission("warehouse");
  try {
    const record = await runDraftListCommand(raw, user.id);
    revalidatePath("/orders"); revalidatePath("/orders/admin");
    return { ok: true as const, record };
  } catch (error) {
    if (error instanceof ZodError) return { ok: false as const, error: "Geçerli bir durum ve sipariş seçin." };
    if (error instanceof DraftConflict || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")) return { ok: false as const, error: "Sipariş başka bir işlemle güncellendi. Güncel listeyi açıp tekrar deneyin." };
    console.error("Order draft list command failed", error);
    return { ok: false as const, error: error instanceof Error && !("code" in error) ? error.message : "İşlem tamamlanamadı. Tekrar deneyin." };
  }
}
