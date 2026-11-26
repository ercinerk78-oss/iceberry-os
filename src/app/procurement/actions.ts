"use server";

import { z } from "zod";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { audit, requirePermission, requireUser } from "@/lib/auth";
import { hasPermissionWithOverrides, type Permission } from "@/lib/permissions";
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  closePurchaseOrder,
  createPurchaseRequest,
  submitPurchaseRequest,
  createPurchaseOrder,
  markPurchaseOrderSent,
  updatePurchaseOrderDetails,
  updatePurchaseOrderItem,
  upsertSupplierProduct,
  changePurchaseOrderLine,
} from "@/lib/procurement-service";
import { prisma } from "@/lib/prisma";
import { recentPurchaseRequestWhere, type RecentPurchaseRequest } from "@/lib/recent-purchase-requests";
import { assertPurchaseRequestReopenable } from "@/lib/purchase-request-drafts";

export type ProcurementActionState = { ok: boolean; message: string; requestId?: string; updatedAt?: string; submitted?: boolean };

export async function getRecentPurchaseRequests(raw: unknown, excludeId?: string): Promise<RecentPurchaseRequest[]> {
  await requireAnyPermission(["warehouse", "procurement"]);
  const productIds = z.array(z.string().min(1).max(200)).max(200).parse(raw);
  if (!productIds.length) return [];
  const items = await prisma.purchaseRequestItem.findMany({
    where: { ...recentPurchaseRequestWhere(productIds), ...(excludeId ? { purchaseRequestId: { not: z.string().min(1).max(200).parse(excludeId) } } : {}) },
    select: { productId: true, requestedQuantity: true, unit: true, purchaseRequest: { select: { requestNumber: true, createdAt: true, warehouse: { select: { name: true } } } } },
    orderBy: { purchaseRequest: { createdAt: "desc" } },
  });
  return items.map(item => ({ productId: item.productId, quantity: item.requestedQuantity, unit: item.unit, requestNumber: item.purchaseRequest.requestNumber, createdAt: item.purchaseRequest.createdAt.toISOString(), warehouseName: item.purchaseRequest.warehouse.name }));
}

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
  let saved: { requestId: string; updatedAt: string } | undefined;
  try {
    const user = await requireAnyPermission(["warehouse", "procurement"]);
    const id = optionalString(formData.get("requestId"));
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
    }, user.id, id ? { id, updatedAt: String(formData.get("updatedAt") || "") } : undefined);
    saved = { requestId: request.id, updatedAt: request.updatedAt.toISOString() };
    if (formData.get("intent") === "submit") await submitPurchaseRequest(request.id, user.id, saved.updatedAt);
    await audit("PURCHASE_REQUEST_SAVED", "PurchaseRequest", request.id, `${request.requestNumber} numaralı satın alma talebi kaydedildi.`, user.id);
    refresh();
    revalidatePath(`/warehouse/purchase-requests/${request.id}`);
    return { ok: true, ...saved, submitted: formData.get("intent") === "submit", message: formData.get("intent") === "submit" ? "Talep onaya gönderildi." : "Taslak kaydedildi. Son Talepler listesinden yeniden düzenleyebilirsiniz." };
  } catch (error) {
    return { ..._, ok: false, ...saved, message: error instanceof Error ? error.message : "Satın alma talebi oluşturulamadı." };
  }
}

async function requireAnyPermission(permissions: Permission[]) {
  const user = await requireUser();
  const allowed = permissions.some((permission) => hasPermissionWithOverrides(user.role, permission, user.permissions));
  if (!allowed) throw new Error("Bu işlemi yapma yetkiniz bulunmuyor.");
  return user;
}

export async function reopenPurchaseRequestAction(id: string, _: ProcurementActionState): Promise<ProcurementActionState> {
  try {
    const user = await requireAnyPermission(["warehouse", "procurement"]);
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "PurchaseRequest" WHERE id = ${id} FOR UPDATE`;
      const request = await tx.purchaseRequest.findUnique({ where: { id }, include: { purchaseOrder: { select: { id: true } } } });
      if (!request) throw new Error("Talep bulunamadı.");
      assertPurchaseRequestReopenable(request.status, Boolean(request.purchaseOrder));
      await tx.purchaseRequest.update({ where: { id }, data: {
        status: "DRAFT", approvedAt: null, approvedById: null,
        approvals: { create: { action: "RETURNED_TO_DRAFT", status: "DRAFT", comment: "Düzenleme için onaydan geri çekilerek taslağa alındı.", actedById: user.id } },
      } });
    });
    refresh();
    revalidatePath(`/warehouse/purchase-requests/${id}`);
    revalidatePath(`/procurement/requests/${id}`);
    return { ok: true, message: "Talep taslağa alındı. Düzenleyip tekrar onaya gönderebilirsiniz." };
  } catch (error) {
    return { ..._, ok: false, message: error instanceof Error ? error.message : "Talep taslağa alınamadı." };
  }
}

export async function updatePurchaseRequestSupplierAction(id: string, _: ProcurementActionState, formData: FormData): Promise<ProcurementActionState> {
  try {
    const user = await requirePermission("procurement");
    const value = String(formData.get("supplierId") || "").trim();
    const supplierId = value && value !== "__UNSPECIFIED__" ? value : null;
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "PurchaseRequest" WHERE id = ${id} FOR UPDATE`;
      const supplier = supplierId ? await tx.supplier.findFirst({ where: { id: supplierId, archivedAt: null, status: "ACTIVE" } }) : null;
      if (supplierId && !supplier) throw new Error("Aktif tedarikçi bulunamadı.");
      const result = await tx.purchaseRequest.updateMany({
        where: { id, status: { notIn: ["CANCELLED", "REJECTED", "CONVERTED"] }, purchaseOrder: { is: null } },
        data: { supplierId },
      });
      if (!result.count) throw new Error("Talep bulunamadı veya artık düzenlenemiyor.");
      await tx.purchaseApproval.create({ data: {
        purchaseRequestId: id, action: "SUPPLIER_UPDATED", status: "UPDATED",
        comment: `Önerilen tedarikçi: ${supplier?.name ?? "DİĞER / BELİRSİZ"}`, actedById: user.id,
      } });
    });
    refresh();
    return { ok: true, message: "Talebin tedarikçisi güncellendi." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Tedarikçi güncellenemedi." };
  }
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

export async function updatePurchaseOrderDetailsAction(id: string, formData: FormData) {
  const user = await requirePermission("procurement");
  await updatePurchaseOrderDetails(id, {
    expectedDeliveryDate: optionalString(formData.get("expectedDeliveryDate")),
    paymentTermDays: optionalNumber(formData.get("paymentTermDays")),
    externalReference: optionalString(formData.get("externalReference")),
    notes: optionalString(formData.get("notes")),
    invoiceStatus: optionalString(formData.get("invoiceStatus")),
    paymentStatus: optionalString(formData.get("paymentStatus")),
  }, user.id);
  await audit("PURCHASE_ORDER_UPDATED", "PurchaseOrder", id, "Satın alma siparişi detayları güncellendi.", user.id);
  refresh();
}

export async function updatePurchaseOrderItemAction(itemId: string, formData: FormData) {
  const user = await requirePermission("procurement");
  const quantity = parseDecimalInput(formData.get("quantity"));
  const unitPrice = parseDecimalInput(formData.get("unitPrice"));
  const vatRate = parseDecimalInput(formData.get("vatRate"));
  const discountRate = parseDecimalInput(formData.get("discountRate"));
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Miktar sıfırdan büyük olmalıdır.");
  if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error("Birim fiyat negatif olamaz.");
  if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) throw new Error("KDV oranı 0 ile 100 arasında olmalıdır.");
  if (!Number.isFinite(discountRate) || discountRate < 0 || discountRate > 100) throw new Error("İskonto oranı 0 ile 100 arasında olmalıdır.");
  const order = await updatePurchaseOrderItem(itemId, {
    quantity,
    unitPrice,
    vatRate,
    discountRate,
    notes: optionalString(formData.get("itemNotes")),
  }, user.id);
  await audit("PURCHASE_ORDER_ITEM_UPDATED", "PurchaseOrderItem", itemId, "Satın alma siparişi kalemi güncellendi.", user.id);
  refresh();
  revalidatePath(`/procurement/orders/${order.id}`);
}

export async function changePurchaseOrderLineAction(id: string, _: ProcurementActionState, formData: FormData): Promise<ProcurementActionState> {
  try {
    const user = await requirePermission("procurement");
    const kind = formData.get("kind");
    if (kind !== "ADD" && kind !== "REMOVE") return { ok: false, message: "Geçersiz işlem." };
    await changePurchaseOrderLine(id, kind === "ADD"
      ? { kind, input: Object.fromEntries(formData) }
      : { kind, itemId: String(formData.get("itemId") || "") }, user.id);
    await audit("PURCHASE_ORDER_ITEMS_UPDATED", "PurchaseOrder", id, "Satın alma siparişinin ürünleri düzenlendi.", user.id);
    refresh();
    revalidatePath(`/procurement/orders/${id}`);
    return { ok: true, message: "Sipariş güncellendi." };
  } catch (error) {
    return { ok: false, message: error instanceof Error && !error.message.includes("prisma") ? error.message : "Sipariş güncellenemedi." };
  }
}

export async function updatePurchaseOrderItemWithState(id: string, _: ProcurementActionState, formData: FormData): Promise<ProcurementActionState> {
  try {
    await updatePurchaseOrderItemAction(id, formData);
    return { ok: true, message: "Kalem güncellendi." };
  } catch (error) {
    return { ok: false, message: error instanceof Error && !error.message.includes("prisma") ? error.message : "Kalem güncellenemedi." };
  }
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

export async function updateSupplierAction(id: string, _: ProcurementActionState, formData: FormData): Promise<ProcurementActionState> {
  try {
    const user = await requirePermission("procurement");
    const input = z.object({
      name: z.string().trim().min(1, "Tedarikçi adı zorunludur.").max(200),
      code: z.string().trim().max(200),
      phone: z.string().trim().max(200),
      email: z.union([z.literal(""), z.email()]),
      taxNumber: z.string().trim().max(200),
      taxOffice: z.string().trim().max(200),
      address: z.string().max(1000),
      notes: z.string().max(1000),
      status: z.enum(["ACTIVE", "PASSIVE"]),
    }).safeParse(Object.fromEntries(formData));
    if (!input.success) return { ok: false, message: "Tedarikçi adı, e-posta ve alan uzunluklarını kontrol edin." };
    const { name, status, ...optional } = input.data;
    const supplier = await prisma.supplier.update({
      where: { id, archivedAt: null },
      data: { name, status, ...Object.fromEntries(Object.entries(optional).map(([key,value]) => [key, value || null])) },
    });
    await audit("SUPPLIER_UPDATED", "Supplier", id, `${supplier.name} tedarikçi bilgileri güncellendi.`, user.id);
    refresh();
    return { ok: true, message: "Tedarikçi bilgileri kaydedildi." };
  } catch {
    return { ok: false, message: "Tedarikçi güncellenemedi. Kodun başka bir kayıtta kullanılmadığını ve yetkinizi kontrol edin." };
  }
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
  const quantities = formData.getAll("quantity").map(parseDecimalInput);
  const unitPrices = formData.getAll("unitPrice").map(parseDecimalInput);
  const vatRates = formData.getAll("vatRate").map(parseDecimalInput);
  const discountRates = formData.getAll("discountRate").map(parseDecimalInput);
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
  const text = String(value || "").trim().replace(",", ".");
  if (!text) return undefined;
  const number = Number(text);
  return Number.isFinite(number) ? number : undefined;
}

function parseDecimalInput(value: FormDataEntryValue | null) {
  const text = String(value || "").trim().replace(",", ".");
  if (!text) return Number.NaN;
  return Number(text);
}
