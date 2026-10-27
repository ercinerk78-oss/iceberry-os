"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BACKORDER_REASONS } from "@/lib/backorders";

import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const paths = ["/warehouse/shipments", "/warehouse/orders", "/orders/admin", "/reports"];

export type BackorderState = { success: boolean; message: string };

export async function createManualBackorder(_: BackorderState, formData: FormData): Promise<BackorderState> {
  const user = await requirePermission("shipment_manage");
  const parsed = z.object({ branchId: z.string().min(1), productId: z.string().min(1), quantity: z.coerce.number().finite().positive(), reason: z.string().refine((value) => value in BACKORDER_REASONS), note: z.string().trim().max(2000), expectedFulfillmentDate: z.string() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: "Şube, ürün ve sıfırdan büyük eksik miktarı kontrol edin." };
  const data = parsed.data;
  const due = data.expectedFulfillmentDate ? new Date(`${data.expectedFulfillmentDate}T12:00:00+03:00`) : null;
  if (due && !Number.isFinite(due.getTime())) return { success: false, message: "Geçerli bir tarih girin." };
  try {
    const [branch, product] = await Promise.all([
      prisma.branch.findFirst({ where: { id: data.branchId, archivedAt: null }, select: { id: true } }),
      prisma.product.findFirst({ where: { id: data.productId, archivedAt: null }, select: { id: true, unit: true } }),
    ]);
    if (!branch || !product) return { success: false, message: "Şube veya ürün artık kullanılamıyor." };
    await prisma.shipmentBackorder.create({ data: { branchId: branch.id, productId: product.id, orderedQuantity: data.quantity, outstandingQuantity: data.quantity, unit: product.unit, reason: data.reason, note: data.note || null, expectedFulfillmentDate: due, createdById: user.id } });
    refresh();
    return { success: true, message: "Manuel eksik sevk kaydı eklendi." };
  } catch (error) {
    console.error("[shipments] Manual backorder create failed", error);
    return { success: false, message: "Eksik sevk kaydı eklenemedi." };
  }
}

export async function completeManualBackorder(id: string, _: BackorderState, formData: FormData): Promise<BackorderState> {
  void formData;
  const user = await requirePermission("shipment_manage");
  try {
    await prisma.$transaction(async (tx) => {
      const item = await tx.shipmentBackorder.findUnique({ where: { id } });
      if (!item) throw new Error("Eksik sevk kaydı bulunamadı.");
      if (item.status === "CANCELLED") throw new Error("İptal edilen kayıt tamamlanamaz.");
      if (item.status === "FULFILLED") return;
      const result = await tx.shipmentBackorder.updateMany({ where: { id, status: item.status, outstandingQuantity: item.outstandingQuantity }, data: { outstandingQuantity: 0, fulfilledQuantity: { increment: item.outstandingQuantity }, status: "FULFILLED", fulfilledAt: new Date(), completedById: user.id } });
      if (!result.count) throw new Error("Kayıt değişti. Sayfayı yenileyip tekrar deneyin.");
    });
    refresh();
    return { success: true, message: "Eksik sevk tamamlandı." };
  } catch (error) {
    console.error("[shipments] Backorder completion failed", error);
    return { success: false, message: error instanceof Error ? error.message : "Kayıt tamamlanamadı." };
  }
}

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
