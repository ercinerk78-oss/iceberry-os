import { AppShell } from "@/components/app-shell";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CountWorkspace } from "./workspace";

export const dynamic = "force-dynamic";
export default async function StockCountsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requirePermission("warehouse");
  const { id } = await searchParams;
  const rows = await prisma.stockCount.findMany({ include: { warehouse: { select: { name: true } }, _count: { select: { items: true } } }, orderBy: { createdAt: "desc" } });
  const selected = id ? await prisma.stockCount.findUnique({ where: { id }, include: { items: { include: { product: { select: { name: true, sku: true, unit: true } } }, orderBy: { createdAt: "asc" } } } }) : null;
  const warehouses = await prisma.warehouse.findMany({ select: { id: true, name: true } });
  const products = await prisma.product.findMany({ where: { isActive: true }, select: { id: true, name: true, sku: true, unit: true }, orderBy: { name: "asc" } });
  return <AppShell activeHref="/warehouse/counts" eyebrow="Merkez depo" title="Depo Sayımları"><CountWorkspace rows={rows.map(row => ({ id: row.id, title: row.title, status: row.status, warehouse: row.warehouse.name, date: (row.startedAt ?? row.createdAt).toISOString(), itemCount: row._count.items }))} warehouses={warehouses} products={products} selected={selected ? { id: selected.id, title: selected.title, status: selected.status, items: selected.items.map(item => ({ productId: item.productId, name: item.product.name, sku: item.product.sku, unit: item.product.unit, quantity: item.countedQuantity, expected: item.expectedQuantity })) } : null} /></AppShell>;
}
