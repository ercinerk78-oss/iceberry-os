import { AppShell } from "@/components/app-shell";
import { OrderForm } from "@/components/orders/order-form";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { TICIMAX_IMPORT_UNIT } from "@/lib/product-import";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import Link from "next/link";
import { hasPermissionWithOverrides } from "@/lib/permissions";
import { emptyDraftValues, warehouseDraftStages, type DraftRecord } from "@/lib/order-draft";
import { money } from "@/lib/warehouse";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ draft?: string; new?: string }> }) {
  const user = await requirePermission("orders");
  const params = await searchParams;
  if (params.draft && !z.uuid().safeParse(params.draft).success) notFound();
  const draftId = params.new ? randomUUID() : params.draft || randomUUID();
  const selectedDraft = await prisma.franchiseOrder.findUnique({ where: { id: draftId }, select: {
    id: true, orderNumber: true, draftVersion: true, status: true, warehouseDraftStage: true, warehouseId: true, franchiseeId: true, branchId: true, invoicePreference: true, notes: true, requestedDeliveryDate: true, updatedAt: true,
    items: { select: { productId: true, quantity: true, manualShortShipment: true } },
  } });
  const [warehouse, owners, standaloneBranches, products] = await Promise.all([
    prisma.warehouse.findFirst({
      where: { isActive: true, id: selectedDraft?.warehouseId },
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
      where: { OR: [{ isActive: true, archivedAt: null }, { id: { in: selectedDraft?.items.map(item => item.productId) ?? [] } }] },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        salePrice: true,
        currency: true,
        vatRate: true,
        isActive: true,
        archivedAt: true,
        units: { where: { code: TICIMAX_IMPORT_UNIT }, select: { conversionFactor: true } },
        stocks: { select: { warehouseId: true, availableQuantity: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);
  const drafts = await prisma.franchiseOrder.findMany({ where: { status: "DRAFT" }, take: 50, orderBy: { updatedAt: "desc" }, select: {
    id: true, orderNumber: true, warehouseDraftStage: true, updatedAt: true, grandTotal: true, currency: true, branch: { select: { branchName: true } }, franchisee: { select: { companyName: true } }, _count: { select: { items: true } },
  } });
  const initialValues = emptyDraftValues();
  if (selectedDraft) {
    initialValues.cart = Object.fromEntries(selectedDraft.items.map(item => [item.productId, item.quantity]));
    initialValues.shortages = Object.fromEntries(selectedDraft.items.map(item => [item.productId, item.manualShortShipment]));
    initialValues.baseMode = Object.fromEntries(selectedDraft.items.map(item => {
      const factor = products.find(product => product.id === item.productId)?.units[0]?.conversionFactor ?? 1;
      return [item.productId, Math.abs(item.quantity / factor - Math.round(item.quantity / factor)) > 1e-8];
    }));
    initialValues.franchiseeId = selectedDraft.franchiseeId || "";
    initialValues.branchId = selectedDraft.branchId || "";
    initialValues.notes = selectedDraft.notes || "";
    initialValues.requestedDeliveryDate = selectedDraft.requestedDeliveryDate?.toISOString().slice(0, 10) || "";
    initialValues.invoicePreference = ["CREATE_PARASUT_INVOICE", "NOT_REQUIRED"].includes(selectedDraft.invoicePreference) ? selectedDraft.invoicePreference as typeof initialValues.invoicePreference : "CREATE_LATER";
  }
  const initialRecord: DraftRecord | null = selectedDraft ? { id: selectedDraft.id, version: selectedDraft.draftVersion, orderNumber: selectedDraft.orderNumber, status: selectedDraft.status, warehouseDraftStage: selectedDraft.warehouseDraftStage, updatedAt: selectedDraft.updatedAt.toISOString() } : null;

  return (
    <AppShell activeHref="/orders" eyebrow="Şube sipariş portalı" title="Bayi Siparişleri">
      <section className="mb-6 space-y-3 border-b pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Sipariş Taslakları</h2><Link href="/orders?new=1" className="text-sm font-medium underline">Yeni Taslak</Link></div>
        <div className="max-h-72 overflow-auto border">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="sticky top-0 bg-muted"><tr>{["Taslak No", "Şube", "Depo Aşaması", "Ürün Kalemi", "Tutar", "Son Güncelleme", ""].map((label, index) => <th key={index} className="p-3">{label}</th>)}</tr></thead>
            <tbody>{drafts.map(draft => <tr key={draft.id} className={`border-t ${draft.id === draftId ? "bg-muted/50" : ""}`}>
              <td className="p-3 font-medium">{draft.orderNumber}</td>
              <td className="p-3">{draft.branch?.branchName || draft.franchisee?.companyName || "Şube seçilmedi"}</td>
              <td className="p-3">{warehouseDraftStages[draft.warehouseDraftStage as keyof typeof warehouseDraftStages] ?? "Taslak"}</td>
              <td className="p-3">{draft._count.items}</td><td className="p-3">{money(draft.grandTotal, draft.currency)}</td>
              <td className="p-3">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(draft.updatedAt)}</td>
              <td className="p-3"><Link href={`/orders?draft=${draft.id}`} className="font-medium underline">Düzenle</Link></td>
            </tr>)}{!drafts.length ? <tr><td colSpan={7} className="p-4 text-muted-foreground">Kayıtlı sipariş taslağı yok.</td></tr> : null}</tbody>
          </table>
        </div>
      </section>
      {!warehouse ? (
        <p>Aktif depo bulunamadı.</p>
      ) : (
        <OrderForm
          key={draftId}
          draftId={draftId}
          userId={user.id}
          initialValues={initialValues}
          initialRecord={initialRecord}
          canSubmit={hasPermissionWithOverrides(user.role, "warehouse", user.permissions)}
          canViewCenter={hasPermissionWithOverrides(user.role, "order_admin", user.permissions)}
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
            unavailable: !product.isActive || !!product.archivedAt,
            salesUnitFactor: product.units[0]?.conversionFactor ?? 1,
            available: product.stocks.find((stock) => stock.warehouseId === warehouse.id)?.availableQuantity ?? 0,
          }))}
        />
      )}
    </AppShell>
  );
}
