import { AppShell } from "@/components/app-shell";
import { PurchaseOrderForm } from "@/components/procurement/purchase-order-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewPurchaseOrderPage() {
  const [suppliers, warehouses, products] = await Promise.all([
    prisma.supplier.findMany({ where: { archivedAt: null, status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ where: { archivedAt: null, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { archivedAt: null, isActive: true },
      select: { id: true, name: true, sku: true, unit: true, purchasePrice: true, vatRate: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AppShell activeHref="/procurement/orders" eyebrow="Merkez satın alma" title="Yeni Satın Alma Siparişi">
      <PurchaseOrderForm
        suppliers={suppliers}
        warehouses={warehouses}
        products={products.map((product) => ({
          ...product,
          purchasePrice: product.purchasePrice || 0,
          vatRate: product.vatRate || 20,
        }))}
      />
    </AppShell>
  );
}
