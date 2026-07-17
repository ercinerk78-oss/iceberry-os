import Link from "next/link";
import { AlertTriangle, CheckCircle2, PauseCircle, PlayCircle, RefreshCw, Search, ShieldCheck } from "lucide-react";

import { ignoreIntegrationEvent, retryIntegrationEvent, setIntegrationActive, testConnection } from "@/app/integrations/actions";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMissingSchemaError } from "@/lib/supply-chain-data";

export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;
const get = (params: Params, key: string) => (typeof params[key] === "string" ? params[key] : "");

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requirePermission("integrations");
  const params = await searchParams;
  const tab = get(params, "tab") || "Genel Bakış";
  const provider = get(params, "provider");
  const status = get(params, "status");
  const today = new Date();
  const nowTime = today.getTime();
  today.setHours(0, 0, 0, 0);
  const since24h = new Date(nowTime - 24 * 60 * 60 * 1000);

  const eventWhere = {
    ...(provider ? { provider } : {}),
    ...(status ? { status } : {}),
  };

  const [
    connections,
    events,
    reconciliations,
    ticimaxToday,
    mappingPendingOrders,
    invoiceMissingOrders,
    orderlessInvoices,
    amountMismatch,
    pendingPurchaseInvoices,
    pendingGoodsReceipts,
    productMappingPending,
    branchMappingPending,
    supplierMappingPending,
    failedEvents,
    retryEvents,
    last24Events,
    last24Success,
  ] = await Promise.all([
    safeList(prisma.integrationConnection.findMany({ orderBy: [{ provider: "asc" }, { environment: "asc" }] }), "IntegrationConnection"),
    safeList(prisma.integrationEvent.findMany({ where: eventWhere, orderBy: { createdAt: "desc" }, take: 80 }), "IntegrationEvent"),
    safeList(prisma.reconciliationRecord.findMany({ orderBy: { createdAt: "desc" }, take: 80 }), "ReconciliationRecord"),
    safeCount(prisma.franchiseOrder.count({ where: { source: "TICIMAX", createdAt: { gte: today } } }), "FranchiseOrder.source"),
    safeCount(prisma.integrationEvent.count({ where: { status: "MANUAL_REVIEW", errorCode: { in: ["BRANCH_MAPPING_ERROR", "PRODUCT_MAPPING_ERROR"] } } }), "IntegrationEvent"),
    safeCount(prisma.franchiseOrder.count({ where: { financialStatus: { in: ["INVOICE_PENDING", "INVOICE_FAILED"] }, orderType: { notIn: ["INTERNAL_TRANSFER", "BRANCH_TRANSFER", "WAREHOUSE_TRANSFER"] } } }), "FranchiseOrder.financialStatus"),
    safeCount(prisma.externalInvoice.count({ where: { invoiceType: "SALES", orderId: null } }), "ExternalInvoice"),
    safeCount(prisma.reconciliationRecord.count({ where: { reconciliationType: "SALES_ORDER_INVOICE", status: "AMOUNT_MISMATCH" } }), "ReconciliationRecord"),
    safeCount(prisma.externalInvoice.count({ where: { invoiceType: "PURCHASE", goodsReceiptId: null } }), "ExternalInvoice"),
    safeCount(prisma.goodsReceipt.count({ where: { status: "PENDING_RECEIPT" } }), "GoodsReceipt"),
    safeCount(prisma.productMappingQueue.count({ where: { status: "PENDING" } }), "ProductMappingQueue"),
    safeCount(prisma.integrationEvent.count({ where: { status: "MANUAL_REVIEW", errorCode: "BRANCH_MAPPING_ERROR" } }), "IntegrationEvent"),
    safeCount(prisma.integrationEvent.count({ where: { status: "MANUAL_REVIEW", errorCode: "SUPPLIER_MAPPING_ERROR" } }), "IntegrationEvent"),
    safeCount(prisma.integrationEvent.count({ where: { status: "FAILED" } }), "IntegrationEvent"),
    safeCount(prisma.integrationEvent.count({ where: { status: "RETRY_PENDING" } }), "IntegrationEvent"),
    safeCount(prisma.integrationEvent.count({ where: { createdAt: { gte: since24h } } }), "IntegrationEvent"),
    safeCount(prisma.integrationEvent.count({ where: { status: "SUCCESS", createdAt: { gte: since24h } } }), "IntegrationEvent"),
  ]);

  const successRate = last24Events ? Math.round((last24Success / last24Events) * 100) : 100;
  const connectionRows = ["TICIMAX", "PARASUT"].map((name) => connections.find((item) => item.provider === name) ?? {
    id: name,
    provider: name,
    environment: "PRODUCTION",
    status: "DISCONNECTED",
    lastSuccessfulSyncAt: null,
    lastFailedSyncAt: null,
    lastErrorMessage: null,
    isActive: false,
  });

  return (
    <AppShell activeHref="/integrations" eyebrow="Operasyon ve muhasebe entegrasyonu" title="Entegrasyon ve Mutabakat">
      <div className="space-y-5">
        <Card className="shadow-none">
          <CardContent className="flex flex-wrap gap-2 p-4">
            {["Genel Bakış", "Ticimax Siparişleri", "Paraşüt Satış Faturaları", "Paraşüt Alış Faturaları", "Sipariş-Fatura Mutabakatı", "Mal Kabul-Fatura Mutabakatı", "Ürün Eşleştirmeleri", "Şube ve Müşteri Eşleştirmeleri", "Başarısız İşlemler", "Entegrasyon Logları"].map((item) => (
              <Button key={item} asChild variant={tab === item ? "default" : "outline"} size="sm">
                <Link href={`/integrations?tab=${encodeURIComponent(item)}`}>{item}</Link>
              </Button>
            ))}
          </CardContent>
        </Card>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric title="Bugün Gelen Ticimax Siparişi" value={ticimaxToday} href="/integrations?tab=Ticimax%20Sipari%C5%9Fleri" />
          <Metric title="Eşleştirme Bekleyen Sipariş" value={mappingPendingOrders} href="/integrations?tab=Başarısız%20İşlemler&status=MANUAL_REVIEW" />
          <Metric title="Faturası Eşleşmeyen Sipariş" value={invoiceMissingOrders} href="/integrations?tab=Sipariş-Fatura%20Mutabakatı" />
          <Metric title="Siparişi Olmayan Satış Faturası" value={orderlessInvoices} href="/integrations?tab=Paraşüt%20Satış%20Faturaları" />
          <Metric title="Fatura Tutarı Farklı Sipariş" value={amountMismatch} href="/integrations?tab=Sipariş-Fatura%20Mutabakatı" />
          <Metric title="Bekleyen Paraşüt Alış Faturası" value={pendingPurchaseInvoices} href="/integrations?tab=Paraşüt%20Alış%20Faturaları" />
          <Metric title="Bekleyen Mal Kabul" value={pendingGoodsReceipts} href="/warehouse/goods-receipts" />
          <Metric title="Ürün Eşleştirme Bekleyen" value={productMappingPending} href="/warehouse/product-mappings" />
          <Metric title="Şube Eşleştirme Bekleyen" value={branchMappingPending} href="/integrations?tab=Şube%20ve%20Müşteri%20Eşleştirmeleri" />
          <Metric title="Tedarikçi Eşleştirme Bekleyen" value={supplierMappingPending} href="/integrations?tab=Paraşüt%20Alış%20Faturaları" />
          <Metric title="Başarısız Entegrasyon İşlemi" value={failedEvents} href="/integrations?tab=Başarısız%20İşlemler&status=FAILED" />
          <Metric title="Retry Bekleyen İşlem" value={retryEvents} href="/integrations?tab=Başarısız%20İşlemler&status=RETRY_PENDING" />
          <Metric title="Son 24 Saat Başarı Oranı" value={`%${successRate}`} href="/integrations?tab=Entegrasyon%20Logları" />
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          {connectionRows.map((connection) => (
            <Card key={connection.provider} className="shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{connection.provider === "TICIMAX" ? "Ticimax" : "Paraşüt"}</span>
                  <Badge variant="outline">{connection.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Info label="Ortam" value={connection.environment} />
                <Info label="Son başarılı senkronizasyon" value={formatDate(connection.lastSuccessfulSyncAt)} />
                <Info label="Son başarısız senkronizasyon" value={formatDate(connection.lastFailedSyncAt)} />
                <Info label="Son hata" value={connection.lastErrorMessage ?? "Yok"} />
                <Info label="Durum" value={connection.isActive ? "Aktif" : "Pasif"} />
                <div className="flex flex-wrap gap-2 pt-2">
                  <form action={testConnection.bind(null, connection.provider)}><Button size="sm" variant="outline"><ShieldCheck /> Bağlantıyı Test Et</Button></form>
                  <form action={setIntegrationActive.bind(null, connection.provider, !connection.isActive)}>
                    <Button size="sm" variant="outline">{connection.isActive ? <PauseCircle /> : <PlayCircle />} {connection.isActive ? "Durdur" : "Aktifleştir"}</Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Search className="size-5" /> Entegrasyon İşlemleri</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="mb-4 flex flex-wrap gap-2">
              <input type="hidden" name="tab" value={tab} />
              <select name="provider" defaultValue={provider} className="h-10 rounded-lg border px-3">
                <option value="">Tüm sağlayıcılar</option>
                <option value="TICIMAX">Ticimax</option>
                <option value="PARASUT">Paraşüt</option>
              </select>
              <select name="status" defaultValue={status} className="h-10 rounded-lg border px-3">
                <option value="">Tüm durumlar</option>
                {["RECEIVED", "PROCESSING", "SUCCESS", "RETRY_PENDING", "FAILED", "IGNORED", "MANUAL_REVIEW"].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <Button>Filtrele</Button>
            </form>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-[#f8faf6] text-xs uppercase text-[#65705f]">
                  <tr>{["Sağlayıcı", "Olay", "Yön", "Dış Kayıt", "Durum", "Deneme", "Sonraki Retry", "Hata", "İşlem"].map((item) => <th key={item} className="px-3 py-2">{item}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td className="px-3 py-3 font-medium">{event.provider}</td>
                      <td className="px-3 py-3">{event.eventType}</td>
                      <td className="px-3 py-3">{event.direction}</td>
                      <td className="px-3 py-3">{event.externalEntityId ?? "—"}</td>
                      <td className="px-3 py-3"><StatusBadge status={event.status} /></td>
                      <td className="px-3 py-3">{event.attemptCount}</td>
                      <td className="px-3 py-3">{formatDate(event.nextRetryAt)}</td>
                      <td className="px-3 py-3">{event.errorMessage ?? "—"}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <form action={retryIntegrationEvent.bind(null, event.id)}><Button size="sm" variant="outline"><RefreshCw /> Yeniden Dene</Button></form>
                          <form action={ignoreIntegrationEvent.bind(null, event.id)}><Button size="sm" variant="outline">Yok Say</Button></form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!events.length ? <p className="rounded-lg border border-dashed p-8 text-center text-[#65705f]">Entegrasyon işlemi yok.</p> : null}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader><CardTitle>Mutabakat Kayıtları</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {reconciliations.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                <div>
                  <p className="font-semibold">{item.reconciliationType}</p>
                  <p className="text-sm text-[#65705f]">{item.discrepancyDetails ?? "Detay yok"} · {item.currency ?? "TRY"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{item.status}</Badge>
                  <span className="text-sm">Fark: {item.differenceAmount?.toString() ?? "—"}</span>
                </div>
              </div>
            ))}
            {!reconciliations.length ? <p className="rounded-lg border border-dashed p-8 text-center text-[#65705f]">Mutabakat kaydı yok.</p> : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Metric({ title, value, href }: { title: string; value: string | number; href: string }) {
  return (
    <Link href={href}>
      <Card className="h-full shadow-none transition hover:border-[#6fbe44]">
        <CardContent className="p-4">
          <p className="text-sm text-[#65705f]">{title}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3 border-b border-[#edf0e9] pb-2"><span className="text-[#65705f]">{label}</span><strong className="text-right">{value}</strong></div>;
}

function StatusBadge({ status }: { status: string }) {
  const ok = status === "SUCCESS";
  const danger = status === "FAILED" || status === "MANUAL_REVIEW";
  return (
    <Badge className={ok ? "bg-emerald-100 text-emerald-800" : danger ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}>
      {ok ? <CheckCircle2 className="size-3" /> : danger ? <AlertTriangle className="size-3" /> : null}
      {status}
    </Badge>
  );
}

function formatDate(value?: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(value));
}

async function safeCount(promise: Promise<number>, label: string) {
  try {
    return await promise;
  } catch (error) {
    if (isMissingSchemaError(error)) {
      console.warn(`[integrations] ${label} henüz production şemasında yok.`);
      return 0;
    }
    throw error;
  }
}

async function safeList<T>(promise: Promise<T[]>, label: string) {
  try {
    return await promise;
  } catch (error) {
    if (isMissingSchemaError(error)) {
      console.warn(`[integrations] ${label} henüz production şemasında yok.`);
      return [] as T[];
    }
    throw error;
  }
}
