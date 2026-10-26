"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const paths = ["/warehouse/shipments", "/warehouse/orders", "/orders/admin", "/reports"];

function refresh() {
  for (const path of paths) revalidatePath(path);
}

export async function updateBackorderPlan(id: string, formData: FormData) {
  await requirePermission("shipment_manage");
  await prisma.shipmentBackorder.update({
    where: { id },
    data: {
      reason: String(formData.get("reason") || "STOCK_SHORTAGE"),
      note: String(formData.get("note") || "") || null,
      expectedFulfillmentDate: formData.get("expectedFulfillmentDate") ? new Date(String(formData.get("expectedFulfillmentDate"))) : null,
    },
  });
  refresh();
}

export async function cancelBackorder(id: string, formData: FormData) {
  await requirePermission("shipment_manage");
  await prisma.shipmentBackorder.update({
    where: { id },
    data: {
      status: "CANCELLED",
      note: String(formData.get("note") || "") || null,
    },
  });
  refresh();
}

export async function markBackorderFulfilled(id: string) {
  const user = await requirePermission("shipment_manage");
  const backorder = await prisma.shipmentBackorder.findUnique({ where: { id } });
  if (!backorder) return;
  if (backorder.outstandingQuantity > 0) {
    throw new Error("Kalan miktar sıfırlanmadan borçlu ürün kapatılamaz.");
  }
  await prisma.shipmentBackorder.update({
    where: { id },
    data: { status: "FULFILLED", fulfilledAt: new Date(), completedById: user.id },
  });
  refresh();
}
