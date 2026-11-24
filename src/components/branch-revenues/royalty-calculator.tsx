"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateDeliveryRoyalty, royaltySettingsSchema, type RoyaltySaveInput } from "@/lib/finance/delivery-royalty";
import { saveRoyaltyCalculation } from "@/app/branch-revenues/royalty/actions";

export type RoyaltyCalculatorProps = {
  branchName: string; revenueId: string; period: string; totalRevenue: string;
  revenueUpdatedAt: string; branchUpdatedAt: string; rate: 2 | 3; deliveryRevenue: string;
  startMonth: string; exemptionNote: string; revenueStatus: string; savedTotalRevenue?: string;
};
export function RoyaltyCalculator(props: RoyaltyCalculatorProps) {
  const [deliveryRevenue, setDelivery] = useState(props.deliveryRevenue);
  const [rate, setRate] = useState<2 | 3>(props.rate);
  const [startMonth, setStart] = useState(props.startMonth);
  const [exemptionNote, setNote] = useState(props.exemptionNote);
  const [versions, setVersions] = useState({ revenueUpdatedAt: props.revenueUpdatedAt, branchUpdatedAt: props.branchUpdatedAt });
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  let error = "";
  let result: ReturnType<typeof calculateDeliveryRoyalty> | null = null;
  try {
    if (!deliveryRevenue.trim()) error = "Paket servis cirosu bekleniyor.";
    else result = calculateDeliveryRoyalty({ totalRevenue: props.totalRevenue, deliveryRevenue, rate, period: props.period, startMonth });
    const settings = royaltySettingsSchema.safeParse({ rate, startMonth, exemptionNote });
    if (!settings.success) error = settings.error.issues[0].message;
  } catch (failure) { error = failure instanceof Error && !failure.message.startsWith("[") ? failure.message : "Geçerli bir tutar ve dönem girin."; }
  const money = (value: string) => `${Number(value).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
  const edit = () => { setDirty(true); setNotice(""); };
  const inputClass = "mt-1 block h-10 w-full rounded-md border bg-background px-3 text-sm";
  return <section className="space-y-5 border-y py-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{props.branchName}</h2><p className="text-sm">Royalty dönemi: <strong>{props.period}</strong></p></div>
    {!["APPROVED", "LOCKED"].includes(props.revenueStatus) && <p className="text-sm text-amber-800">Ciro henüz onaylanmadı. Sonuç ön hesaplamadır.</p>}
    {props.savedTotalRevenue && props.savedTotalRevenue !== props.totalRevenue && <p role="alert" className="text-sm text-amber-800">Toplam ciro son kayıttan sonra değişmiş. Hesap güncel ciroyla yeniden gösteriliyor; kontrol edip kaydedin.</p>}
    <form onSubmit={event => {
      event.preventDefault();
      if (error || !result) return;
      const input: RoyaltySaveInput = { revenueId: props.revenueId, period: props.period, ...versions, deliveryRevenue, rate, startMonth, exemptionNote };
      start(async () => {
        try {
          const saved = await saveRoyaltyCalculation(input);
          if (!saved.ok) { setNotice(saved.message); return; }
          setVersions({ revenueUpdatedAt: saved.revenueUpdatedAt, branchUpdatedAt: saved.branchUpdatedAt });
          setDirty(false); setNotice("Hesaplama kaydedildi. Borç veya fatura oluşturulmadı.");
        } catch { setNotice("Bağlantı kurulamadı. Bilgileriniz ekranda korunuyor; tekrar kaydedin."); }
      });
    }} className="space-y-5">
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm">Toplam Ciro<input className={inputClass} aria-label="Toplam Ciro" value={money(props.totalRevenue)} readOnly /></label>
        <label className="text-sm">Paket Servis Cirosu (TL)<input aria-label="Paket Servis Cirosu" type="number" inputMode="decimal" min="0" max={props.totalRevenue} step="0.01" required className={inputClass} value={deliveryRevenue} onChange={event => { edit(); setDelivery(event.target.value); }} /></label>
        <label className="text-sm">Royalty Oranı<select aria-label="Royalty Oranı" className={inputClass} value={rate} onChange={event => { edit(); setRate(Number(event.target.value) as 2 | 3); }}><option value={2}>%2</option><option value={3}>%3</option></select></label>
        <label className="text-sm">Royalty Başlangıç Ayı<input aria-label="Royalty Başlangıç Ayı" type="month" min="2000-01" max="2100-12" className={inputClass} value={startMonth} onChange={event => { edit(); setStart(event.target.value); }} /></label>
        <label className="text-sm sm:col-span-2">Muafiyet Notu<textarea aria-label="Muafiyet Notu" maxLength={1000} value={exemptionNote} onChange={event => { edit(); setNote(event.target.value); }} className="mt-1 block min-h-20 w-full rounded-md border p-3" /></label>
      </fieldset>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {result?.exempt && <p role="status" className="border-l-4 border-amber-500 bg-amber-50 p-3 text-sm">Bu dönem royalty muafiyetinde. Başlangıç ayı: {startMonth}. {exemptionNote}</p>}
      {result && !error && <dl className="grid gap-x-6 gap-y-3 border-y py-4 sm:grid-cols-2 lg:grid-cols-3">{[
        ["Kafe Cirosu", result.cafeRevenue], ["Paket Servisinin %60’ı", result.eligibleDeliveryRevenue], ["Royalty Matrahı", result.royaltyBase], [`Royalty (%${rate}, KDV Hariç)`, result.netRoyalty], ["KDV (%20)", result.vat], ["KDV Dahil Royalty", result.totalRoyalty],
      ].map(([label, value]) => <div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className={`mt-1 font-semibold ${label === "KDV Dahil Royalty" ? "text-xl text-emerald-800" : "text-base"}`}>{money(value)}</dd></div>)}</dl>}
      <div className="flex flex-wrap items-center gap-3"><Button disabled={pending || Boolean(error) || !result} type="submit"><Save className="size-4" />{pending ? "Kaydediliyor..." : "Hesaplamayı Kaydet"}</Button>{dirty && <span className="text-sm text-amber-800">Kaydedilmemiş değişiklikler var.</span>}</div>
      {notice && <p role="status" className="text-sm">{notice}</p>}
    </form>
  </section>;
}
