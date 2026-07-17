import { AppShell } from "@/components/app-shell";
import { OrderTable } from "@/components/orders/order-table";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function WarehouseOrders() {
  const orders = await prisma.franchiseOrder.findMany({
    where: { status: { in: ["WAREHOUSE_QUEUE", "PREPARING", "READY"] } },
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
    orderBy: { requestedDeliveryDate: "asc" },
  });

  return (
    <AppShell activeHref="/warehouse/orders" eyebrow="Merkez depo" title="Hazırlanacak Siparişler">
      <OrderTable orders={orders} />
    </AppShell>
  );
}
