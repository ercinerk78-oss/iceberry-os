import { AppShell } from "@/components/app-shell";
import { PurchaseOrderForm } from "@/components/procurement/purchase-order-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { requestId?: string };

export default async function NewPurchaseOrderPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const [suppliers, warehouses, products, sourceRequest] = await Promise.all([
    prisma.supplier.findMany({ where: { archivedAt: null, status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ where: { archivedAt: null, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { archivedAt: null, isActive: true },
      select: { id: true, name: true, sku: true, unit: true, purchasePrice: true, vatRate: true },
      orderBy: { name: "asc" },
    }),
    params.requestId
      ? prisma.purchaseRequest.findUnique({
        where: { id: params.requestId },
        include: {
          supplier: { select: { id: true } },
          items: { include: { product: { select: { purchasePrice: true, vatRate: true } } }, orderBy: { createdAt: "asc" } },
          purchaseOrder: { select: { id: true } },
        },
      })
      : Promise.resolve(null),
  ]);
  const usableSourceRequest = sourceRequest && !sourceRequest.purchaseOrder && !["CANCELLED", "REJECTED", "CONVERTED"].includes(sourceRequest.status)
    ? sourceRequest
    : null;

  return (
    <AppShell activeHref="/procurement/orders" eyebrow="Merkez satın alma" title={usableSourceRequest ? "Talebi Siparişe Dönüştür" : "Yeni Satın Alma Siparişi"}>
      <PurchaseOrderForm
        suppliers={suppliers}
        warehouses={warehouses}
        products={products.map((product) => ({
          ...product,
          purchasePrice: product.purchasePrice || 0,
          vatRate: product.vatRate || 20,
        }))}
        sourceRequestId={usableSourceRequest?.id}
        sourceRequestNumber={usableSourceRequest?.requestNumber}
        initialSupplierId={usableSourceRequest?.supplier?.id}
        initialWarehouseId={usableSourceRequest?.warehouseId}
        initialLines={usableSourceRequest?.items.map((item) => ({
          key: item.id,
          productId: item.productId,
          quantity: item.approvedQuantity ?? item.requestedQuantity,
          unitPrice: Number(item.estimatedUnitCost ?? item.product.purchasePrice ?? 0),
          vatRate: item.product.vatRate || 20,
          discountRate: 0,
          notes: item.notes ?? "",
        }))}
      />
    </AppShell>
  );
}
