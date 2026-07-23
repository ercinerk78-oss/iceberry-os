"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { audit, requirePermission } from "@/lib/auth";
import { approveOrder, changeOrderStatus, createInvoice, createOrder, prepareOrder, releaseOrder, shipOrder } from "@/lib/order-service";
import { prisma } from "@/lib/prisma";
import { setPhysicalStock } from "@/lib/stock-service";
import { productSchema } from "@/lib/validations/order";

export type ActionResult = { ok: boolean; message: string };

const paths = ["/", "/orders", "/orders/admin", "/warehouse/orders", "/warehouse/stock", "/warehouse/shipments", "/warehouse/movements"];

function refresh() {
  for (const path of paths) revalidatePath(path);
}

export async function submitOrder(_: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("orders");
    const items = JSON.parse(String(formData.get("items") || "[]"));
    const order = await createOrder({
      franchiseeId: formData.get("franchiseeId"),
      branchId: formData.get("branchId") || undefined,
      warehouseId: formData.get("warehouseId"),
      requestedDeliveryDate: formData.get("requestedDeliveryDate") || undefined,
      invoicePreference: formData.get("invoicePreference") || undefined,
      notes: formData.get("notes") || undefined,
      items,
    });
    if (formData.get("invoicePreference") === "CREATE_PARASUT_INVOICE") {
      try {
        await createInvoice(order.id);
      } catch (error) {
        await prisma.franchiseOrder.update({
          where: { id: order.id },
          data: {
            financialStatus: "INVOICE_FAILED",
            invoiceStatus: "FAILED",
            activities: {
              create: {
                type: "PARASUT_INVOICE_CREATE_FAILED",
                description: error instanceof Error ? error.message : "Paraşüt faturası oluşturulamadı.",
              },
            },
          },
        });
      }
    }
    refresh();

    return { ok: true, message: `${order.orderNumber} numaralı sipariş oluşturuldu.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Sipariş oluşturulamadı." };
  }
}

export async function orderCommand(id: string, command: string, formData?: FormData) {
  const user = await requirePermission(command === "invoice" ? "invoice" : command === "ship" ? "shipment_manage" : "order_admin");
  if (command === "approve") await approveOrder(id);
  else if (command === "invoice") await createInvoice(id);
  else if (command === "queue") await changeOrderStatus(id, "WAREHOUSE_QUEUE");
  else if (command === "ready") await changeOrderStatus(id, "READY");
  else if (command === "reject") await releaseOrder(id, "REJECTED");
  else if (command === "cancel") await releaseOrder(id, "CANCELLED");
  else if (command === "ship") await shipOrder(id, String(formData?.get("carrierName") || ""), String(formData?.get("trackingNumber") || ""), {
    reason: String(formData?.get("backorderReason") || "STOCK_SHORTAGE"),
    note: String(formData?.get("backorderNote") || ""),
    expectedFulfillmentDate: formData?.get("expectedFulfillmentDate") ? new Date(String(formData.get("expectedFulfillmentDate"))) : null,
    createdById: user.id,
  });
  await audit(command === "approve" ? "ORDER_APPROVED" : command === "invoice" ? "INVOICE_CREATED" : command === "ship" ? "ORDER_SHIPPED" : "ORDER_UPDATED", "FranchiseOrder", id, `Sipariş işlemi: ${command}`, user.id);
  refresh();
}

export async function savePreparation(id: string, formData: FormData) {
  await requirePermission("warehouse");
  const ids = formData.getAll("itemId").map(String);
  const prepared = formData.getAll("preparedQuantity").map(Number);
  const missing = formData.getAll("missingQuantity").map(Number);
  await prepareOrder(id, ids.map((itemId, index) => ({ id: itemId, preparedQuantity: prepared[index] || 0, missingQuantity: missing[index] || 0 })));
  refresh();
}

export async function createProduct(formData: FormData) {
  await requirePermission("stock_manage");
  const data = productSchema.parse(Object.fromEntries(formData));
  await prisma.product.create({ data: { ...data, barcode: data.barcode || null } });
  refresh();
}

export async function adjustStock(formData: FormData) {
  const user = await requirePermission("stock_manage");
  const warehouseId = String(formData.get("warehouseId"));
  const productId = String(formData.get("productId"));
  const quantity = Number(formData.get("quantity"));
  await prisma.$transaction(async (tx) => {
    await setPhysicalStock(tx, {
      warehouseId,
      productId,
      quantity,
      movementType: "CORRECTION_IN",
      referenceType: "MANUAL",
      description: "Manuel stok güncellemesi.",
      performedById: user.id,
    });
  });
  await audit("STOCK_ADJUSTED", "Product", productId, "Manuel stok düzeltmesi yapıldı.", user.id);
  refresh();
}

export async function goToOrder(id: string) {
  await requirePermission("warehouse");
  redirect(`/warehouse/orders/${id}`);
}
