import Link from "next/link";

import { orderCommand } from "@/app/orders/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dateTime, money, ORDER_STATUSES, warehouseLabel } from "@/lib/warehouse";

type Row = {
  id: string;
  orderNumber: string;
  status: string;
  invoiceStatus: string;
  grandTotal: number;
  currency: string;
  createdAt: Date;
  franchisee: { companyName: string };
  branch: { branchName: string } | null;
  items: { quantity: number }[];
};

export function OrderTable({ orders, admin = false }: { orders: Row[]; admin?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full min-w-[850px] text-sm">
        <thead className="bg-[#f1f4ef] text-left">
          <tr>
            {["Sipariş", "Şube / Grup", "Durum", "Kalem", "Tutar", "Tarih", "İşlem"].map((header) => (
              <th key={header} className="p-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-t">
              <td className="p-3 font-semibold">{order.orderNumber}</td>
              <td className="p-3">
                {order.franchisee.companyName}
                <div className="text-xs text-[#65705f]">{order.branch?.branchName ?? "Genel"}</div>
              </td>
              <td className="p-3">
                <Badge variant="outline">{warehouseLabel(ORDER_STATUSES, order.status)}</Badge>
                <div className="mt-1 text-xs">Fatura: {order.invoiceStatus}</div>
              </td>
              <td className="p-3">
                {order.items.length} / {order.items.reduce((total, item) => total + item.quantity, 0)} ürün
              </td>
              <td className="p-3">{money(order.grandTotal, order.currency)}</td>
              <td className="p-3">{dateTime(order.createdAt)}</td>
              <td className="p-3">
                <div className="flex gap-1">
                  <Button asChild size="sm" variant="outline">
                    <Link href={admin ? `/orders/admin/${order.id}` : `/warehouse/orders/${order.id}`}>İncele</Link>
                  </Button>
                  {admin && order.status === "SUBMITTED" ? (
                    <form action={orderCommand.bind(null, order.id, "approve")}>
                      <Button size="sm">Onayla</Button>
                    </form>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
          {!orders.length ? (
            <tr>
              <td colSpan={7} className="p-10 text-center text-[#65705f]">
                Kayıt bulunamadı.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
