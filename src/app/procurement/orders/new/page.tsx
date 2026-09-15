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
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        purchasePrice: true,
        vatRate: true,
        supplierProducts: {
          where: { isActive: true, supplier: { archivedAt: null, status: "ACTIVE" } },
          select: { supplierId: true, unitPrice: true, isPreferred: true, supplierSku: true, supplierProductName: true },
          orderBy: [{ isPreferred: "desc" }, { updatedAt: "desc" }],
        },
      },
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
          supplierProducts: product.supplierProducts.map((mapping) => ({
            ...mapping,
            unitPrice: mapping.unitPrice == null ? null : Number(mapping.unitPrice),
          })),
        }))}
        sourceRequestId={usableSourceRequest?.id}
        sourceRequestNumber={usableSourceRequest?.requestNumber}
        initialSupplierId={usableSourceRequest?.supplier?.id}
        initialWarehouseId={usableSourceRequest?.warehouseId}
        initialLines={usableSourceRequest?.items.map((item) => ({
          key: item.id,
          productId: item.productId,
          productSearch: `${item.productName} - ${item.sku}`,
          quantity: String(item.approvedQuantity ?? item.requestedQuantity).replace(".", ","),
          unitPrice: String(Number(item.estimatedUnitCost ?? item.product.purchasePrice ?? 0)).replace(".", ","),
          vatRate: String(Number(item.vatRate ?? item.product.vatRate ?? 20)).replace(".", ","),
          discountRate: "0",
          notes: item.notes ?? "",
        }))}
      />
    </AppShell>
  );
}
