"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Barcode, CheckCircle2, PackageCheck, PencilLine } from "lucide-react";

import { confirmPickingControl, overridePickingItem, scanBarcodeForOrder, type ActionResult } from "@/app/orders/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PickingItem = {
  id: string;
  productName: string;
  sku: string;
  barcode: string | null;
  quantity: number;
  reservedQuantity: number;
  pickedQuantity: number;
  packedQuantity: number;
  shippedQuantity: number;
  missingQuantity: number;
  stockQuantity: number;
  scanCount: number;
  manualOverrideCount: number;
};

type Scan = {
  id: string;
  productName: string;
  barcode: string | null;
  quantity: number;
  scanType: string;
  note: string | null;
  scannedAt: string;
};

const initialState: ActionResult = { ok: false, message: "" };

const manualReasons = [
  ["DAMAGED_BARCODE", "Barkod hasarlı"],
  ["UNREADABLE_BARCODE", "Barkod okunmuyor"],
  ["TEMPORARY_NO_BARCODE", "Geçici barkodsuz ürün"],
  ["SYSTEM_ISSUE", "Sistem problemi"],
  ["OTHER", "Diğer"],
] as const;

export function WarehousePickingPanel({
  orderId,
  items,
  scans,
  canShip,
}: {
  orderId: string;
  items: PickingItem[];
  scans: Scan[];
  canShip: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanState, scanAction, scanPending] = useActionState(scanBarcodeForOrder, initialState);
  const [overrideState, overrideAction, overridePending] = useActionState(overridePickingItem, initialState);
  const [confirmState, confirmAction, confirmPending] = useActionState(confirmPickingControl, initialState);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (scanState.message || overrideState.message || confirmState.message) {
      router.refresh();
      inputRef.current?.focus();
    }
  }, [scanState.message, overrideState.message, confirmState.message, router]);

  const latestMessage = confirmState.message || overrideState.message || scanState.message;
  const isOk = confirmState.message ? confirmState.ok : overrideState.message ? overrideState.ok : scanState.ok;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border bg-white p-4">
        <form action={scanAction} className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input type="hidden" name="orderId" value={orderId} />
          <label className="text-sm font-medium">
            Barkodu okut
            <input
              ref={inputRef}
              name="barcode"
              autoFocus
              autoComplete="off"
              placeholder="Barkod okuyucuyu bu alanda kullanın"
              className="mt-2 h-12 w-full rounded-lg border px-4 text-base"
            />
          </label>
          <Button className="self-end" disabled={scanPending}>
            <Barcode className="size-4" />
            {scanPending ? "Okutuluyor..." : "Barkodu İşle"}
          </Button>
        </form>
        {latestMessage ? (
          <p className={`mt-3 rounded-lg p-3 text-sm ${isOk ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {latestMessage}
          </p>
        ) : null}
      </section>

      <section className="grid gap-3">
        {items.map((item) => {
          const isComplete = item.pickedQuantity >= item.quantity;
          const isPartial = item.pickedQuantity > 0 && item.pickedQuantity < item.quantity;
          const needsManualReason = item.pickedQuantity > item.scanCount && item.manualOverrideCount === 0;

          return (
            <article key={item.id} className="rounded-xl border bg-white p-4">
              <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">{item.productName}</h3>
                      <p className="text-sm text-[#65705f]">
                        SKU: {item.sku} · Barkod: {item.barcode ?? "Tanımlı değil"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={isComplete ? "default" : isPartial ? "secondary" : "outline"}>
                        {isComplete ? "Tamamlandı" : isPartial ? "Kısmi" : "Bekliyor"}
                      </Badge>
                      {needsManualReason ? <Badge variant="destructive">Gerekçe gerekli</Badge> : null}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <Metric label="Sipariş" value={item.quantity} />
                    <Metric label="Rezerve" value={item.reservedQuantity} />
                    <Metric label="Hazırlanan" value={item.pickedQuantity} strong />
                    <Metric label="Paketlenen" value={item.packedQuantity} />
                    <Metric label="Sevk edilen" value={item.shippedQuantity} />
                    <Metric label="Eksik" value={Math.max(0, item.quantity - item.pickedQuantity)} danger={item.pickedQuantity < item.quantity} />
                    <Metric label="Fiziksel stok" value={item.stockQuantity} />
                    <Metric label="Barkod doğrulama" value={`${item.scanCount}/${item.pickedQuantity}`} />
                  </div>
                </div>

                <form action={overrideAction} className="grid gap-2 rounded-lg border bg-[#f8faf6] p-3">
                  <input type="hidden" name="orderId" value={orderId} />
                  <input type="hidden" name="orderItemId" value={item.id} />
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <PencilLine className="size-4" />
                    Manuel düzeltme
                  </div>
                  <input
                    name="pickedQuantity"
                    type="number"
                    min="0"
                    max={item.quantity}
                    step="0.01"
                    defaultValue={item.pickedQuantity}
                    className="h-10 rounded-lg border px-3"
                  />
                  <select name="reason" defaultValue="" className="h-10 rounded-lg border px-3">
                    <option value="">Neden seçin</option>
                    {manualReasons.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <input name="note" placeholder="Manuel işlem notu" className="h-10 rounded-lg border px-3" />
                  <Button variant="outline" disabled={overridePending}>
                    {overridePending ? "Kaydediliyor..." : "Manuel Kaydet"}
                  </Button>
                </form>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Barcode className="size-4" />
            Son Barkod İşlemleri
          </h2>
          <div className="space-y-2">
            {scans.map((scan) => (
              <div key={scan.id} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <b>{scan.productName}</b>
                  <span className="text-[#65705f]">{scan.scannedAt}</span>
                </div>
                <p className="text-[#65705f]">
                  {scan.scanType === "MANUAL_OVERRIDE" ? "Manuel işlem" : "Barkod okutma"} · {scan.barcode ?? "Barkodsuz"} · Miktar {scan.quantity}
                </p>
                {scan.note ? <p className="mt-1 text-[#65705f]">{scan.note}</p> : null}
              </div>
            ))}
            {!scans.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-[#65705f]">Henüz barkod işlemi yok.</p> : null}
          </div>
        </div>

        <form action={confirmAction} className="h-fit rounded-xl border bg-white p-4">
          <input type="hidden" name="orderId" value={orderId} />
          <h2 className="flex items-center gap-2 font-semibold">
            <PackageCheck className="size-4" />
            Depo Kontrolü
          </h2>
          <p className="mt-2 text-sm text-[#65705f]">
            Onaydan sonra hazırlanan miktarlar paketlenen miktar olarak kesinleşir ve fatura yalnızca bu miktarlar için oluşturulabilir.
          </p>
          <Button className="mt-4 w-full" disabled={confirmPending || canShip}>
            <CheckCircle2 className="size-4" />
            {canShip ? "Depo Kontrolü Onaylandı" : confirmPending ? "Onaylanıyor..." : "Depo Kontrolünü Onayla"}
          </Button>
        </form>
      </section>
    </div>
  );
}

function Metric({ label, value, strong = false, danger = false }: { label: string; value: string | number; strong?: boolean; danger?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${danger ? "bg-amber-50 text-amber-800" : "bg-[#f8faf6]"}`}>
      <p className="text-xs text-[#65705f]">{label}</p>
      <p className={`mt-1 ${strong ? "text-lg font-semibold" : "font-medium"}`}>{value}</p>
    </div>
  );
}
