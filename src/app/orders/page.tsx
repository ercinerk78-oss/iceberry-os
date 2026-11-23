import { AppShell } from "@/components/app-shell";
import { OrderForm } from "@/components/orders/order-form";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { TICIMAX_IMPORT_UNIT } from "@/lib/product-import";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  await requirePermission("orders");
  const [warehouse, owners, standaloneBranches, products] = await Promise.all([
    prisma.warehouse.findFirst({
      where: { isActive: true },
      select: { id: true },
    }),
    prisma.franchisee.findMany({
      where: { archivedAt: null },
      select: {
        id: true,
        companyName: true,
        branches: {
          where: { archivedAt: null },
          select: { id: true, branchName: true },
          orderBy: { branchName: "asc" },
        },
      },
      orderBy: { companyName: "asc" },
    }),
    prisma.branch.findMany({
      where: { archivedAt: null, OR: [{ franchiseeId: null }, { franchisee: { archivedAt: { not: null } } }] },
      select: { id: true, branchName: true },
      orderBy: { branchName: "asc" },
    }),
    prisma.product.findMany({
      where: { isActive: true, archivedAt: null },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        salePrice: true,
        currency: true,
        vatRate: true,
        units: { where: { code: TICIMAX_IMPORT_UNIT }, select: { conversionFactor: true } },
        stocks: { select: { warehouseId: true, availableQuantity: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AppShell activeHref="/orders" eyebrow="Şube sipariş portalı" title="Yeni Sipariş">
      {!warehouse ? (
        <p>Aktif depo bulunamadı.</p>
      ) : (
        <OrderForm
          warehouseId={warehouse.id}
          standaloneBranches={standaloneBranches}
          owners={owners.map((owner) => ({
            id: owner.id,
            companyName: owner.companyName,
            branches: owner.branches.map((branch) => ({ id: branch.id, branchName: branch.branchName })),
          }))}
          products={products.map((product) => ({
            id: product.id,
            name: product.name,
            sku: product.sku,
            unit: product.unit,
            salePrice: product.salePrice,
            currency: product.currency,
            vatRate: product.vatRate,
            salesUnitFactor: product.units[0]?.conversionFactor ?? 1,
            available: product.stocks.find((stock) => stock.warehouseId === warehouse.id)?.availableQuantity ?? 0,
          }))}
        />
      )}
    </AppShell>
  );
}
