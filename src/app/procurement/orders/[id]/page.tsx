import { notFound } from "next/navigation";

import { purchaseOrderCommand } from "@/app/procurement/actions";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { procurementDate, procurementLabel, procurementMoney, PURCHASE_ORDER_STATUSES } from "@/lib/procurement";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      warehouse: { select: { name: true } },
      items: { orderBy: { createdAt: "asc" } },
      approvals: { orderBy: { actedAt: "desc" } },
      goodsReceipts: { include: { items: { select: { id: true } } }, orderBy: { createdAt: "desc" } },
      externalInvoices: { orderBy: { createdAt: "desc" } },
      reconciliationRecords: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) notFound();

  const totalOrdered = order.items.reduce((sum, item) => sum + item.orderedQuantity, 0);
  const totalReceived = order.items.reduce((sum, item) => sum + item.receivedQuantity, 0);

  return (
    <AppShell activeHref="/procurement/orders" eyebrow="Satın alma siparişi" title={order.orderNumber}>
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card className="shadow-none">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <Badge variant="outline">{procurementLabel(PURCHASE_ORDER_STATUSES, order.status)}</Badge>
                <p className="mt-2 text-lg font-semibold">{order.supplier.name}</p>
                <p className="text-sm text-[#65705f]">
                  {order.warehouse.name} · Beklenen teslim {procurementDate(order.expectedDeliveryDate)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold">{procurementMoney(order.grandTotal, order.currency)}</p>
                <p className="text-sm text-[#65705f]">Teslimat {totalReceived} / {totalOrdered}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader><CardTitle>Ürün Kalemleri</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-[#f8faf6] text-xs uppercase text-[#65705f]">
                  <tr>{["Ürün", "Sipariş", "Teslim", "Kalan", "Birim Fiyat", "KDV", "İskonto", "Toplam"].map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-3"><b>{item.productName}</b><p className="text-xs text-[#65705f]">{item.sku}</p></td>
                      <td className="px-3 py-3">{item.orderedQuantity} {item.unit}</td>
                      <td className="px-3 py-3">{item.receivedQuantity}</td>
                      <td className="px-3 py-3">{item.remainingQuantity}</td>
                      <td className="px-3 py-3">{procurementMoney(item.unitPrice, order.currency)}</td>
                      <td className="px-3 py-3">%{item.vatRate.toString()}</td>
                      <td className="px-3 py-3">%{item.discountRate.toString()}</td>
                      <td className="px-3 py-3">{procurementMoney(item.lineTotal, order.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card className="shadow-none">
              <CardHeader><CardTitle>Bağlı Mal Kabuller</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {order.goodsReceipts.map((receipt) => (
                  <div key={receipt.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex justify-between"><b>{receipt.invoiceNumber ?? receipt.externalDocumentId ?? receipt.id}</b><Badge variant="outline">{receipt.status}</Badge></div>
                    <p className="text-[#65705f]">Kalem: {receipt.items.length} · {procurementDate(receipt.createdAt)}</p>
                  </div>
                ))}
                {!order.goodsReceipts.length ? <Empty text="Bu siparişe bağlı mal kabul yok." /> : null}
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader><CardTitle>Fatura ve Mutabakat</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {order.externalInvoices.map((invoice) => (
                  <div key={invoice.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex justify-between"><b>{invoice.invoiceNumber ?? invoice.externalInvoiceId}</b><Badge variant="outline">{invoice.status}</Badge></div>
                    <p className="text-[#65705f]">{invoice.supplierName ?? order.supplier.name} · {procurementMoney(invoice.total, invoice.currency)}</p>
                  </div>
                ))}
                {order.reconciliationRecords.map((record) => (
                  <div key={record.id} className="rounded-lg border border-dashed p-3 text-sm">
                    <div className="flex justify-between"><b>{record.reconciliationType}</b><Badge variant="outline">{record.status}</Badge></div>
                    <p className="text-[#65705f]">{record.discrepancyDetails ?? "Detay yok"}</p>
                  </div>
                ))}
                {!order.externalInvoices.length && !order.reconciliationRecords.length ? <Empty text="Fatura veya mutabakat kaydı yok." /> : null}
              </CardContent>
            </Card>
          </section>
        </div>

        <div className="space-y-4">
          <Card className="shadow-none">
            <CardHeader><CardTitle>İşlemler</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {order.approvalStatus !== "APPROVED" && !["CANCELLED", "CLOSED"].includes(order.status) ? (
                <form action={purchaseOrderCommand.bind(null, order.id, "approve")}><Button className="w-full">Onayla</Button></form>
              ) : null}
              {order.approvalStatus === "APPROVED" && !["SENT", "PARTIALLY_RECEIVED", "RECEIVED", "CLOSED", "CANCELLED"].includes(order.status) ? (
                <form action={purchaseOrderCommand.bind(null, order.id, "send")}><Button className="w-full" variant="outline">Tedarikçiye Gönderildi İşaretle</Button></form>
              ) : null}
              {!["CLOSED", "CANCELLED"].includes(order.status) ? (
                <form action={purchaseOrderCommand.bind(null, order.id, "close")}><Button className="w-full" variant="outline">Siparişi Kapat</Button></form>
              ) : null}
              {!["CLOSED", "CANCELLED", "RECEIVED"].includes(order.status) ? (
                <form action={purchaseOrderCommand.bind(null, order.id, "cancel")}><Button className="w-full" variant="destructive">İptal Et</Button></form>
              ) : null}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader><CardTitle>Tedarikçi Bilgileri</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Info label="Telefon" value={order.supplier.phone ?? "-"} />
              <Info label="E-posta" value={order.supplier.email ?? "-"} />
              <Info label="Vergi No" value={order.supplier.taxNumber ?? "-"} />
              <Info label="Vergi Dairesi" value={order.supplier.taxOffice ?? "-"} />
              <Info label="Vade" value={order.paymentTermDays ? `${order.paymentTermDays} gün` : "-"} />
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader><CardTitle>Zaman Çizelgesi</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {order.approvals.map((approval) => (
                <div key={approval.id} className="border-l-2 border-[#a8ff60] pl-3 text-sm">
                  <p className="font-medium">{approval.action}</p>
                  <p className="text-[#65705f]">{approval.comment ?? approval.status} · {procurementDate(approval.actedAt)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3 border-b pb-2"><span className="text-[#65705f]">{label}</span><b className="text-right">{value}</b></div>;
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-[#65705f]">{text}</p>;
}
