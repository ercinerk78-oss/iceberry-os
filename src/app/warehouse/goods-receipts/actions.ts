"use server";

import { revalidatePath } from "next/cache";

import { audit, requirePermission } from "@/lib/auth";
import { createGoodsReceipt } from "@/lib/procurement-service";

export type GoodsReceiptActionState = { ok: boolean; message: string };

export async function createGoodsReceiptAction(_: GoodsReceiptActionState, formData: FormData): Promise<GoodsReceiptActionState> {
  try {
    const user = await requirePermission("warehouse");
    const receipt = await createGoodsReceipt({
      purchaseOrderId: String(formData.get("purchaseOrderId") || ""),
      invoiceNumber: optionalString(formData.get("invoiceNumber")),
      deliveryDate: optionalString(formData.get("deliveryDate")),
      notes: optionalString(formData.get("notes")),
      items: receiptItemsFromForm(formData),
    }, user.id);

    await audit("GOODS_RECEIPT_COMPLETED", "GoodsReceipt", receipt.id, "Mal kabul sayımı tamamlandı ve stoklara işlendi.", user.id);
    revalidatePath("/warehouse/goods-receipts");
    revalidatePath("/warehouse/stock");
    revalidatePath("/warehouse/movements");
    revalidatePath("/procurement");
    revalidatePath("/procurement/orders");
    revalidatePath(`/procurement/orders/${String(formData.get("purchaseOrderId") || "")}`);
    return { ok: true, message: "Mal kabul kaydedildi, kabul edilen miktarlar stoğa işlendi." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Mal kabul kaydedilemedi." };
  }
}

function receiptItemsFromForm(formData: FormData) {
  const productIds = formData.getAll("productId").map(String);
  const expectedQuantities = formData.getAll("expectedQuantity").map(Number);
  const receivedQuantities = formData.getAll("receivedQuantity").map(Number);
  const acceptedQuantities = formData.getAll("acceptedQuantity").map(Number);
  const damagedQuantities = formData.getAll("damagedQuantity").map(Number);
  const lotNumbers = formData.getAll("lotNumber").map(String);
  const expirationDates = formData.getAll("expirationDate").map(String);
  const notes = formData.getAll("itemNotes").map(String);

  return productIds
    .map((productId, index) => ({
      productId,
      expectedQuantity: finiteOrZero(expectedQuantities[index]),
      receivedQuantity: finiteOrZero(receivedQuantities[index]),
      acceptedQuantity: finiteOrZero(acceptedQuantities[index]),
      damagedQuantity: finiteOrZero(damagedQuantities[index]),
      lotNumber: lotNumbers[index] || undefined,
      expirationDate: expirationDates[index] || undefined,
      notes: notes[index] || undefined,
    }))
    .filter((item) => item.productId);
}

function finiteOrZero(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function optionalString(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text || undefined;
}
