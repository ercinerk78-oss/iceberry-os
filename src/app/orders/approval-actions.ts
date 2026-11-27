"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { audit, requirePermission } from "@/lib/auth";
import { approveOrder } from "@/lib/order-service";

export async function approveOrderAction(id: string, previous: { ok: boolean; message: string }) {
  const user = await requirePermission("order_admin");
  try {
    await approveOrder(id);
  } catch (error) {
    const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined;
    console.error("ORDER_APPROVAL_FAILED", { orderId: id, userId: user.id, code, error: error instanceof Error ? error.message : "Unknown error" });
    const message = code === "P2028" || code === "P2034"
      ? "Onay işlemi zaman aşımına uğradı veya eşzamanlı işlemle çakıştı. İşlem geri alındı; tekrar deneyebilirsiniz."
      : error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientInitializationError
        ? "Veritabanına erişilirken bir sorun oluştu. Siparişi kontrol edip tekrar deneyin."
        : error instanceof Error ? error.message : "Sipariş onaylanamadı.";
    return { ...previous, ok: false, message };
  }
  await audit("ORDER_APPROVED", "FranchiseOrder", id, "Sipariş onaylandı ve stok rezerve edildi.", user.id).catch(error => console.error("ORDER_APPROVAL_AUDIT_FAILED", { orderId: id, error: error instanceof Error ? error.name : "Unknown error" }));
  for (const path of ["/orders/admin", `/orders/admin/${id}`, "/warehouse/orders", `/warehouse/orders/${id}`, "/warehouse/stock", "/warehouse/movements", "/orders"]) revalidatePath(path);
  return { ok: true, message: "Sipariş onaylandı ve stok rezerve edildi." };
}
