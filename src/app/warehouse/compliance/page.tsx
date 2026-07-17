import Link from "next/link";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { emptyOnMissingSchema } from "@/lib/supply-chain-data";
import { dateTime } from "@/lib/warehouse";

export const dynamic = "force-dynamic";

const statusClasses: Record<string, string> = {
  OPEN: "bg-rose-100 text-rose-800",
  ACKNOWLEDGED: "bg-amber-100 text-amber-800",
  RESOLVED: "bg-emerald-100 text-emerald-800",
  DISMISSED: "bg-slate-100 text-slate-700",
};

const severityLabels: Record<string, string> = {
  LOW: "Düşük",
  MEDIUM: "Orta",
  HIGH: "Yüksek",
  CRITICAL: "Kritik",
};

export default async function SupplyCompliancePage() {
  const alerts = await emptyOnMissingSchema(
    prisma.supplyComplianceAlert.findMany({
      include: {
        branch: { select: { branchName: true, city: true } },
        warehouse: { select: { name: true } },
        order: { select: { orderNumber: true } },
        product: { select: { name: true, sku: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
    }),
    "supply-compliance",
  );

  const open = alerts.filter((alert) => alert.status === "OPEN").length;
  const critical = alerts.filter((alert) => alert.severity === "CRITICAL").length;
  const resolved = alerts.filter((alert) => alert.status === "RESOLVED").length;

  return (
    <AppShell
      activeHref="/warehouse/compliance"
      eyebrow="Tedarik kontrol motoru"
      title="Tedarik Uyumsuzlukları"
    >
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <Metric title="Açık Uyarı" value={open} icon={<ShieldAlert className="size-5" />} />
          <Metric title="Kritik" value={critical} icon={<AlertTriangle className="size-5" />} />
          <Metric title="Çözülen" value={resolved} icon={<CheckCircle2 className="size-5" />} />
        </div>

        <Card className="overflow-hidden shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[#f1f4ef] text-xs uppercase text-[#65705f]">
                <tr>
                  {[
                    "Uyarı",
                    "Şube / Depo",
                    "Ürün",
                    "Sipariş",
                    "Önem",
                    "Durum",
                    "Tarih",
                  ].map((header) => (
                    <th key={header} className="px-4 py-3">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold">{alert.title}</p>
                      <p className="mt-1 max-w-md text-xs text-[#65705f]">{alert.description}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p>{alert.branch?.branchName ?? alert.warehouse?.name ?? "Merkez"}</p>
                      <p className="text-xs text-[#65705f]">{alert.branch?.city ?? "Depo"}</p>
                    </td>
                    <td className="px-4 py-4">
                      {alert.product ? (
                        <>
                          <p>{alert.product.name}</p>
                          <p className="text-xs text-[#65705f]">{alert.product.sku}</p>
                        </>
                      ) : (
                        "Genel"
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {alert.order ? (
                        <Link className="font-medium hover:underline" href={`/orders/admin/${alert.orderId}`}>
                          {alert.order.orderNumber}
                        </Link>
                      ) : (
                        "Yok"
                      )}
                    </td>
                    <td className="px-4 py-4">{severityLabels[alert.severity] ?? alert.severity}</td>
                    <td className="px-4 py-4">
                      <Badge className={statusClasses[alert.status] ?? "bg-slate-100 text-slate-700"}>
                        {alert.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">{dateTime(alert.createdAt)}</td>
                  </tr>
                ))}
                {!alerts.length ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-[#65705f]">
                      Aktif tedarik uyumsuzluğu bulunmuyor.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Metric({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card className="flex items-center justify-between p-4 shadow-none">
      <div>
        <p className="text-sm text-[#65705f]">{title}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </div>
      <div className="rounded-lg bg-[#edf7e7] p-3 text-[#497b2f]">{icon}</div>
    </Card>
  );
}
