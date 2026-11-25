"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { executeStockCountTransaction } from "@/lib/stock-count-service";

export async function countCommand(data: FormData): Promise<{ id?: string; error?: string }> {
  const user = await requirePermission("warehouse");
  try {
    const id = await prisma.$transaction(tx => executeStockCountTransaction(tx, data, user.id), { maxWait: 10_000, timeout: 20_000 });
    revalidatePath("/warehouse/counts");
    return { id };
  } catch (error) {
    console.error("Stock count command failed", error);
    if (error instanceof ZodError) return { error: "Geçerli bir ürün ve sıfır veya daha büyük bir miktar girin." };
    return { error: error instanceof Error && !("code" in error) && !error.message.includes("prisma") ? error.message : "Sayım kaydedilemedi. Tekrar deneyin." };
  }
}
