"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { audit, requirePermission, requireUser } from "@/lib/auth";
import { hasPermissionWithOverrides, type Permission } from "@/lib/permissions";
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  closePurchaseOrder,
  createPurchaseRequest,
  createPurchaseOrder,
  markPurchaseOrderSent,
  upsertSupplierProduct,
} from "@/lib/procurement-service";
import { prisma } from "@/lib/prisma";

export type ProcurementActionState = { ok: boolean; message: string };

const refreshPaths = [
  "/procurement",
  "/procurement/requests",
  "/procurement/orders",
  "/procurement/suppliers",
  "/procurement/reports",
  "/warehouse/purchase-requests",
  "/warehouse/goods-receipts",
  "/integrations",
];

function refresh() {
  for (const path of refreshPaths) revalidatePath(path);
}

export async function createPurchaseOrderAction(_: ProcurementActionState, formData: FormData): Promise<ProcurementActionState> {
  let redirectTo: string | null = null;
  try {
    const user = await requirePermission("procurement");
    const order = await createPurchaseOrder({
      sourceRequestId: optionalString(formData.get("sourceRequestId")),
      supplierId: String(formData.get("supplierId") || ""),
      warehouseId: String(formData.get("warehouseId") || ""),
      expectedDeliveryDate: optionalString(formData.get("expectedDeliveryDate")),
      currency: String(formData.get("currency") || "TRY"),
      paymentTermDays: optionalNumber(formData.get("paymentTermDays")),
      externalReference: optionalString(formData.get("externalReference")),
      notes: optionalString(formData.get("notes")),
      items: purchaseItemsFromForm(formData),
    }, user.id);
    await audit("PURCHASE_ORDER_CREATED", "PurchaseOrder", order.id, `${order.orderNumber} numaralı satın alma siparişi oluşturuldu.`, user.id);
    refresh();
    redirectTo = `/procurement/orders/${order.id}`;
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Satın alma siparişi oluşturulamadı." };
  }

  redirect(redirectTo);
}

export async function createPurchaseRequestAction(_: ProcurementActionState, formData: FormData): Promise<ProcurementActionState> {
  try {
    const user = await requireAnyPermission(["warehouse", "procurement"]);
    const request = await createPurchaseRequest({
      title: String(formData.get("title") || ""),
      warehouseId: String(formData.get("warehouseId") || ""),
      supplierId: optionalString(formData.get("supplierId")),
      priority: String(formData.get("priority") || "NORMAL") as "LOW" | "NORMAL" | "HIGH" | "URGENT",
      orderDate: optionalString(formData.get("orderDate")),
      neededByDate: optionalString(formData.get("neededByDate")),
      termDate: optionalString(formData.get("termDate")),
      notes: optionalString(formData.get("notes")),
      items: purchaseRequestItemsFromForm(formData),
    }, user.id);
    await audit("PURCHASE_REQUEST_CREATED", "PurchaseRequest", request.id, `${request.requestNumber} numaralı satın alma talebi oluşturuldu.`, user.id);
    refresh();
    return { ok: true, message: "Satın alma talebi oluşturuldu ve satın alma ekibine iletildi." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Satın alma talebi oluşturulamadı." };
  }
}

async function requireAnyPermission(permissions: Permission[]) {
  const user = await requireUser();
  const allowed = permissions.some((permission) => hasPermissionWithOverrides(user.role, permission, user.permissions));
  if (!allowed) throw new Error("Bu işlemi yapma yetkiniz bulunmuyor.");
  return user;
}

export async function purchaseOrderCommand(id: string, command: string) {
  const user = await requirePermission("procurement");
  if (command === "approve") await approvePurchaseOrder(id, user.id);
  else if (command === "send") await markPurchaseOrderSent(id, user.id);
  else if (command === "close") await closePurchaseOrder(id, user.id);
  else if (command === "cancel") await cancelPurchaseOrder(id, user.id);
  else throw new Error("Geçersiz satın alma işlemi.");

  await audit("PURCHASE_ORDER_UPDATED", "PurchaseOrder", id, `Satın alma işlemi: ${command}`, user.id);
  refresh();
}

export async function createSupplierDirect(formData: FormData) {
  const user = await requirePermission("procurement");
  const name = String(formData.get("name") || "").trim();
  const code = optionalString(formData.get("code"));

  if (!name) throw new Error("Tedarikçi adı zorunludur.");
  if (code) {
    const existing = await prisma.supplier.findUnique({ where: { code }, select: { id: true } });
    if (existing) throw new Error("Bu tedarikçi kodu zaten kullanılıyor.");
  }

  const supplier = await prisma.supplier.create({
    data: {
      name,
      code,
      taxNumber: optionalString(formData.get("taxNumber")),
      taxOffice: optionalString(formData.get("taxOffice")),
      phone: optionalString(formData.get("phone")),
      email: optionalString(formData.get("email")),
      address: optionalString(formData.get("address")),
      status: String(formData.get("status") || "ACTIVE"),
      notes: optionalString(formData.get("notes")),
    },
  });

  await audit("SUPPLIER_CREATED", "Supplier", supplier.id, `${supplier.name} tedarikçi kartı oluşturuldu.`, user.id);
  refresh();
}

export async function saveSupplierProductAction(_: ProcurementActionState, formData: FormData): Promise<ProcurementActionState> {
  try {
    const user = await requirePermission("procurement");
    await upsertSupplierProduct({
      supplierId: String(formData.get("supplierId") || ""),
      productId: String(formData.get("productId") || ""),
      supplierSku: optionalString(formData.get("supplierSku")),
      supplierProductName: optionalString(formData.get("supplierProductName")),
      currency: String(formData.get("currency") || "TRY"),
      unitPrice: optionalNumber(formData.get("unitPrice")),
      minimumOrderQuantity: Number(formData.get("minimumOrderQuantity") || 1),
      orderIncrement: Number(formData.get("orderIncrement") || 1),
      leadTimeDays: optionalNumber(formData.get("leadTimeDays")),
      paymentTermDays: optionalNumber(formData.get("paymentTermDays")),
      isPreferred: formData.get("isPreferred") === "on",
      notes: optionalString(formData.get("notes")),
    });
    await audit("SUPPLIER_PRODUCT_SAVED", "SupplierProduct", String(formData.get("productId") || ""), "Tedarikçi ürün fiyat bilgisi güncellendi.", user.id);
    refresh();
    return { ok: true, message: "Tedarikçi ürün bilgisi kaydedildi." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Tedarikçi ürün bilgisi kaydedilemedi." };
  }
}

export async function saveSupplierProductDirect(formData: FormData) {
  const user = await requirePermission("procurement");
  await upsertSupplierProduct({
    supplierId: String(formData.get("supplierId") || ""),
    productId: String(formData.get("productId") || ""),
    supplierSku: optionalString(formData.get("supplierSku")),
    supplierProductName: optionalString(formData.get("supplierProductName")),
    currency: String(formData.get("currency") || "TRY"),
    unitPrice: optionalNumber(formData.get("unitPrice")),
    minimumOrderQuantity: Number(formData.get("minimumOrderQuantity") || 1),
    orderIncrement: Number(formData.get("orderIncrement") || 1),
    leadTimeDays: optionalNumber(formData.get("leadTimeDays")),
    paymentTermDays: optionalNumber(formData.get("paymentTermDays")),
    isPreferred: formData.get("isPreferred") === "on",
    notes: optionalString(formData.get("notes")),
  });
  await audit("SUPPLIER_PRODUCT_SAVED", "SupplierProduct", String(formData.get("productId") || ""), "Tedarikçi ürün fiyat bilgisi güncellendi.", user.id);
  refresh();
}

function purchaseItemsFromForm(formData: FormData) {
  const productIds = formData.getAll("productId").map(String);
  const quantities = formData.getAll("quantity").map(Number);
  const unitPrices = formData.getAll("unitPrice").map(Number);
  const vatRates = formData.getAll("vatRate").map(Number);
  const discountRates = formData.getAll("discountRate").map(Number);
  const notes = formData.getAll("itemNotes").map(String);

  return productIds
    .map((productId, index) => ({
      productId,
      quantity: quantities[index],
      unitPrice: unitPrices[index],
      vatRate: Number.isFinite(vatRates[index]) ? vatRates[index] : 20,
      discountRate: Number.isFinite(discountRates[index]) ? discountRates[index] : 0,
      notes: notes[index] || undefined,
    }))
    .filter((item) => item.productId && item.quantity > 0);
}

function purchaseRequestItemsFromForm(formData: FormData) {
  const productIds = formData.getAll("productId").map(String);
  const quantities = formData.getAll("quantity").map(parseDecimalInput);
  const estimatedUnitCosts = formData.getAll("estimatedUnitCost").map(parseDecimalInput);
  const vatRates = formData.getAll("vatRate").map(parseDecimalInput);
  const notes = formData.getAll("itemNotes").map(String);

  return productIds
    .map((productId, index) => ({
      productId,
      quantity: quantities[index],
      estimatedUnitCost: Number.isFinite(estimatedUnitCosts[index]) ? estimatedUnitCosts[index] : undefined,
      vatRate: Number.isFinite(vatRates[index]) ? vatRates[index] : 20,
      notes: notes[index] || undefined,
    }))
    .filter((item) => item.productId && item.quantity > 0);
}

function optionalString(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text || undefined;
}

function optionalNumber(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  if (!text) return undefined;
  const number = Number(text);
  return Number.isFinite(number) ? number : undefined;
}

function parseDecimalInput(value: FormDataEntryValue | null) {
  const text = String(value || "").trim().replace(",", ".");
  if (!text) return Number.NaN;
  return Number(text);
}
