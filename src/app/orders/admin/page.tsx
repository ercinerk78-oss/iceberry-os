import { AppShell } from "@/components/app-shell";
import { OrderTable } from "@/components/orders/order-table";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUSES, warehouseLabel } from "@/lib/warehouse";

export const dynamic = "force-dynamic";

export default async function AdminOrders({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const orders = await prisma.franchiseOrder.findMany({
    where: {
      status: params.status || undefined,
      OR: params.q
        ? [{ orderNumber: { contains: params.q } }, { franchisee: { companyName: { contains: params.q } } }]
        : undefined,
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      invoiceStatus: true,
      grandTotal: true,
      currency: true,
      createdAt: true,
      franchisee: { select: { companyName: true } },
      branch: { select: { branchName: true } },
      items: { select: { quantity: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell activeHref="/orders/admin" eyebrow="Merkez sipariş yönetimi" title="Siparişler">
      <div className="space-y-4">
        <form className="flex flex-wrap gap-2 rounded-xl border bg-white p-4">
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Sipariş no veya şube grubu ara"
            className="h-10 min-w-64 rounded-lg border px-3"
          />
          <select name="status" defaultValue={params.status} className="h-10 rounded-lg border px-3">
            <option value="">Tüm durumlar</option>
            {ORDER_STATUSES.map(([value]) => (
              <option key={value} value={value}>
                {warehouseLabel(ORDER_STATUSES, value)}
              </option>
            ))}
          </select>
          <button className="rounded-lg bg-[#17201b] px-4 text-white">Filtrele</button>
        </form>
        <OrderTable orders={orders} admin />
      </div>
    </AppShell>
  );
}
