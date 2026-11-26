import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PurchaseRequestForm } from "@/components/procurement/purchase-request-form";
import { PurchaseRequestReopenForm } from "@/components/procurement/purchase-request-reopen-form";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { hasPermissionWithOverrides } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PurchaseRequestDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!["warehouse", "procurement"].some(permission => hasPermissionWithOverrides(user.role, permission as "warehouse" | "procurement", user.permissions))) notFound();
  const { id } = await params;
  const request = await prisma.purchaseRequest.findUnique({ where: { id }, include: { items: { orderBy: { createdAt: "asc" } }, purchaseOrder: { select: { id: true } } } });
  if (!request) notFound();
  const editable = request.status === "DRAFT" && !request.purchaseOrder;
  const warehouses = await prisma.warehouse.findMany({ where: { archivedAt: null, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const suppliers = await prisma.supplier.findMany({ where: { archivedAt: null, status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const products = await prisma.product.findMany({ where: { archivedAt: null, isActive: true }, select: {
    id: true, name: true, sku: true, unit: true, purchasePrice: true, vatRate: true,
    stocks: { select: { warehouseId: true, quantity: true } },
    supplierProducts: { where: { isActive: true }, select: { unitPrice: true, lastQuotedAt: true, isPreferred: true }, orderBy: [{ isPreferred: "desc" }, { lastQuotedAt: "desc" }, { updatedAt: "desc" }] },
  }, orderBy: { name: "asc" } });
  const dateInput = (date: Date | null) => date?.toISOString().slice(0, 10) ?? "";
  return <AppShell activeHref="/warehouse/purchase-requests" eyebrow={request.requestNumber} title="Satın Alma Talebi Taslağı">
    <div className="space-y-4">
      <Button asChild variant="outline"><Link href="/warehouse/purchase-requests">Taleplere Dön</Link></Button>
      {editable ? <PurchaseRequestForm key={request.id} title="Taslağı Düzenle" warehouses={warehouses} suppliers={suppliers}
        products={products.map(product => ({ ...product, purchasePrice: Number(product.purchasePrice ?? 0), supplierProducts: product.supplierProducts.map(mapping => ({ ...mapping, unitPrice: mapping.unitPrice == null ? null : Number(mapping.unitPrice), lastQuotedAt: mapping.lastQuotedAt?.toISOString() ?? null })) }))}
        draft={{ id: request.id, updatedAt: request.updatedAt.toISOString(), title: request.title, warehouseId: request.warehouseId, supplierId: request.supplierId ?? "", priority: request.priority, orderDate: dateInput(request.orderDate), neededByDate: dateInput(request.neededByDate), termDate: dateInput(request.termDate), notes: request.notes ?? "", items: request.items.map(item => ({ productId: item.productId, quantity: item.requestedQuantity, estimatedUnitCost: item.estimatedUnitCost == null ? null : Number(item.estimatedUnitCost), notes: item.notes ?? "" })) }} />
        : request.status === "SUBMITTED" && !request.purchaseOrder ? <PurchaseRequestReopenForm requestId={request.id} />
        : <p role="status">Bu talep onaylanmış, kapanmış veya siparişe dönüşmüş; düzenlemeye kapalı.</p>}
    </div>
  </AppShell>;
}
