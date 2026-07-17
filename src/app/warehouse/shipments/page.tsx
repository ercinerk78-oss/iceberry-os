import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { dateTime } from "@/lib/warehouse";

export const dynamic = "force-dynamic";

export default async function Shipments() {
  const rows = await prisma.shipment.findMany({
    select: {
      id: true,
      shipmentNumber: true,
      status: true,
      carrierName: true,
      trackingNumber: true,
      shippedAt: true,
      order: {
        select: {
          franchisee: { select: { companyName: true } },
          branch: { select: { branchName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell activeHref="/warehouse/shipments" eyebrow="Merkez depo" title="Sevkiyatlar">
      <div className="space-y-3">
        {rows.map((shipment) => (
          <div key={shipment.id} className="rounded-xl border bg-white p-4">
            <b>{shipment.shipmentNumber}</b> · {shipment.status}
            <p className="text-sm text-[#65705f]">
              {shipment.order.franchisee.companyName} / {shipment.order.branch?.branchName ?? "Genel"} ·{" "}
              {shipment.carrierName ?? "Taşıyıcı yok"} · {shipment.trackingNumber ?? "Takip no yok"} ·{" "}
              {dateTime(shipment.shippedAt)}
            </p>
          </div>
        ))}
        {!rows.length ? (
          <p className="rounded-xl border border-dashed p-10 text-center">Henüz sevkiyat yok.</p>
        ) : null}
      </div>
    </AppShell>
  );
}
