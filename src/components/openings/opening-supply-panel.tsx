"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Archive, PackageCheck, Plus, RotateCcw, Search } from "lucide-react";

import {
  addOpeningSupplyItem,
  archiveOpeningSupplyItem,
  ensureOpeningSupplyItems,
  restoreOpeningSupplyItem,
  setOpeningSupplyItemLogisticsStatus,
  syncOpeningSupplyTemplateSection,
  updateOpeningSupplyItem,
} from "@/app/openings/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  OPENING_SUPPLY_LOGISTICS_STATUSES,
  OPENING_SUPPLY_RESPONSIBLE_PARTIES,
  OPENING_SUPPLY_SOURCE_CATEGORIES,
  OPENING_SUPPLY_STATUSES,
  openingSupplyActiveCount,
  openingSupplyCategoryLabels,
  openingSupplyCompletedCount,
  openingSupplyLogisticsProgress,
  openingSupplyLogisticsStatusLabels,
  openingSupplyPercentage,
  openingSupplyResponsibleLabels,
  openingSupplySectionLabels,
  openingSupplyStatusLabels,
} from "@/lib/opening-supplies";
import type { OpeningState } from "@/lib/validations/opening";

type SupplyItem = {
  id: string;
  section: string;
  category: string | null;
  title: string;
  description: string | null;
  plannedQuantity: number | null;
  quantityUnit: string;
  responsibleParty: string;
  status: string;
  logisticsStatus: string | null;
  logisticsNote: string | null;
  archivedAt: Date | string | null;
  sourceType: string;
  updates?: {
    id: string;
    status: string;
    note: string | null;
    createdAt: Date | string;
  }[];
};

const initialState: OpeningState = { success: false, message: "" };

export function OpeningSupplyPanel({ projectId, section, items }: { projectId: string; section: string; items: SupplyItem[] }) {
  const [state, action] = useActionState(addOpeningSupplyItem.bind(null, projectId), initialState);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const sectionItems = items.filter((item) => item.section === section);
  const activeItems = sectionItems.filter((item) => !item.archivedAt);
  const passiveItems = sectionItems.filter((item) => item.archivedAt);
  const filteredItems = filterItems(activeItems, query, category);
  const percent = openingSupplyPercentage(activeItems);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric title="Tamamlanma" value={`%${percent}`} detail={`${openingSupplyCompletedCount(activeItems)} / ${openingSupplyActiveCount(activeItems)} aktif ürün`} />
        <Metric title="Siparişte" value={countLogistics(activeItems, "SIPARIS").toString()} detail="Sipariş sürecindeki ürün" />
        <Metric title="Depoda" value={countLogistics(activeItems, "DEPODA").toString()} detail="Depoya gelen ürün" />
        <Metric title="Teslim" value={countLogistics(activeItems, "TESLIM_EDILDI").toString()} detail="Teslim edilen ürün" />
      </div>

      {!sectionItems.length ? (
        <Card className="p-5 shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">{openingSupplySectionLabels[section] ?? section} listesi henüz oluşturulmamış</h2>
              <p className="mt-1 text-sm text-[#65705f]">Standart açılış ürün havuzundan başlangıç listesi hazırlanacak.</p>
            </div>
            <form action={ensureOpeningSupplyItems.bind(null, projectId)}>
              <Button><PackageCheck className="size-4" />Ürün Listesini Oluştur</Button>
            </form>
          </div>
        </Card>
      ) : null}

      <Card className="p-4 shadow-none">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
          <label className="relative block">
            <Search className="absolute left-3 top-3 size-4 text-[#65705f]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ürün veya not ara" className="h-10 w-full rounded border bg-white pl-9 pr-3 text-sm" />
          </label>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded border bg-white px-3 text-sm">
            <option value="">Tüm kaynaklar</option>
            {OPENING_SUPPLY_SOURCE_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <form action={syncOpeningSupplyTemplateSection.bind(null, projectId, section)}>
            <Button type="submit" variant="outline" className="w-full whitespace-nowrap"><PackageCheck className="size-4" />Güncel Şablonla Eşitle</Button>
          </form>
        </div>
        <p className="mt-2 text-xs text-[#65705f]">{filteredItems.length} ürün gösteriliyor</p>
      </Card>

      <Card className="p-4 shadow-none">
        <h3 className="font-semibold">Yeni Ürün Ekle</h3>
        <form action={action} className="mt-3 grid gap-3 lg:grid-cols-[1fr_160px_120px_160px_160px_auto]">
          <input type="hidden" name="section" value={section} />
          <input name="title" required placeholder="Ürün adı" className="h-10 rounded border px-3 text-sm" />
          <Select name="category" options={OPENING_SUPPLY_SOURCE_CATEGORIES} defaultValue={defaultCategory(section)} />
          <input name="plannedQuantity" inputMode="decimal" placeholder="Adet" className="h-10 rounded border px-3 text-sm" />
          <input name="quantityUnit" defaultValue="Adet" placeholder="Birim" className="h-10 rounded border px-3 text-sm" />
          <Select name="responsibleParty" options={OPENING_SUPPLY_RESPONSIBLE_PARTIES} defaultValue={defaultResponsible(section)} />
          <Button><Plus className="size-4" />Ekle</Button>
          <textarea name="description" placeholder="Not" className="min-h-16 rounded border px-3 py-2 text-sm lg:col-span-6" />
        </form>
        {state.message ? <p className={`mt-2 text-sm ${state.success ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
      </Card>

      <div className="grid gap-3 xl:grid-cols-2">
        {filteredItems.map((item) => <SupplyItemCard key={item.id} item={item} />)}
      </div>
      {!filteredItems.length ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-[#65705f]">Filtreye uygun aktif ürün bulunamadı.</p> : null}

      {passiveItems.length ? (
        <details className="rounded-lg border bg-white p-4">
          <summary className="cursor-pointer font-semibold">Pasif Ürünler ({passiveItems.length})</summary>
          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            {passiveItems.map((item) => <PassiveSupplyItem key={item.id} item={item} />)}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function SupplyItemCard({ item }: { item: SupplyItem }) {
  const [state, action] = useActionState(updateOpeningSupplyItem.bind(null, item.id), initialState);
  const logisticsProgress = item.logisticsStatus ? (openingSupplyLogisticsProgress[item.logisticsStatus] ?? 0) : 0;
  return (
    <Card className="p-4 shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{item.title}</h3>
          <p className="mt-1 text-sm text-[#65705f]">
            {openingSupplyCategoryLabels[item.category || ""] ?? item.category ?? "Kaynak yok"} · {openingSupplyResponsibleLabels[item.responsibleParty] ?? item.responsibleParty}
          </p>
          {item.plannedQuantity != null ? <p className="mt-1 text-xs font-medium text-[#65705f]">Planlanan: {item.plannedQuantity} {item.quantityUnit || "Adet"}</p> : null}
        </div>
        <Badge variant={item.status === "TAMAMLANDI" ? "default" : "secondary"}>{openingSupplyStatusLabels[item.status] ?? item.status}</Badge>
      </div>
      {item.description ? <p className="mt-3 rounded bg-[#f8faf6] p-2 text-sm text-[#65705f]">{item.description}</p> : null}

      <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50/50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-sky-950">Tedarik: {item.logisticsStatus ? (openingSupplyLogisticsStatusLabels[item.logisticsStatus] ?? item.logisticsStatus) : "Süreç başlamadı"}</p>
          <Badge className={item.logisticsStatus === "TESLIM_EDILDI" ? "bg-emerald-600 text-white" : "bg-sky-100 text-sky-900"}>%{logisticsProgress}</Badge>
        </div>
        <div className="mt-2 h-2 rounded bg-white"><div className="h-2 rounded bg-sky-600" style={{ width: `${logisticsProgress}%` }} /></div>
        {item.logisticsNote ? <p className="mt-2 rounded bg-white p-2 text-sm text-[#65705f]">{item.logisticsNote}</p> : null}
        <form action={setOpeningSupplyItemLogisticsStatus.bind(null, item.id)} className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr_auto]">
          <Select name="logisticsStatus" options={OPENING_SUPPLY_LOGISTICS_STATUSES} defaultValue={item.logisticsStatus ?? "SIPARIS"} />
          <input name="logisticsNote" defaultValue={item.logisticsNote ?? ""} placeholder="Durum notu" className="h-10 rounded border px-3 text-sm" />
          <StatusButton />
        </form>
        {item.updates?.length ? (
          <div className="mt-3 space-y-2">
            {item.updates.map((update) => (
              <p key={update.id} className="rounded bg-white p-2 text-xs text-[#65705f]">
                <span className="font-semibold text-[#132117]">{openingSupplyLogisticsStatusLabels[update.status] ?? update.status}</span> · {formatDateTimeTR(update.createdAt)}
                {update.note ? ` · ${update.note}` : ""}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      <details className="mt-3 rounded-lg border bg-[#fbfcf8] p-3">
        <summary className="cursor-pointer text-sm font-semibold">Ürün bilgilerini düzenle</summary>
        <form action={action} className="mt-3 grid gap-2">
          <input type="hidden" name="section" value={item.section} />
          <input name="title" required defaultValue={item.title} className="h-10 rounded border px-3 text-sm" />
          <div className="grid gap-2 sm:grid-cols-2">
            <Select name="category" options={OPENING_SUPPLY_SOURCE_CATEGORIES} defaultValue={item.category || defaultCategory(item.section)} />
            <Select name="responsibleParty" options={OPENING_SUPPLY_RESPONSIBLE_PARTIES} defaultValue={item.responsibleParty} />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <input name="plannedQuantity" inputMode="decimal" defaultValue={item.plannedQuantity ?? ""} placeholder="Adet" className="h-10 rounded border px-3 text-sm" />
            <input name="quantityUnit" defaultValue={item.quantityUnit || "Adet"} className="h-10 rounded border px-3 text-sm" />
            <Select name="status" options={OPENING_SUPPLY_STATUSES} defaultValue={item.status} />
          </div>
          <textarea name="description" defaultValue={item.description ?? ""} placeholder="Not" className="min-h-16 rounded border px-3 py-2 text-sm" />
          <UpdateButton />
        </form>
        {state.message ? <p className={`mt-2 text-sm ${state.success ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
      </details>
      <form action={archiveOpeningSupplyItem.bind(null, item.id)} className="mt-3">
        <Button type="submit" variant="outline" className="w-full"><Archive className="size-4" />Pasife Al</Button>
      </form>
    </Card>
  );
}

function PassiveSupplyItem({ item }: { item: SupplyItem }) {
  return (
    <div className="rounded-lg border bg-[#fbfcf8] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{item.title}</p>
          <p className="mt-1 text-xs text-[#65705f]">{openingSupplyCategoryLabels[item.category || ""] ?? item.category ?? "Kaynak yok"}</p>
        </div>
        <Badge variant="outline">Pasif</Badge>
      </div>
      <form action={restoreOpeningSupplyItem.bind(null, item.id)} className="mt-3">
        <Button type="submit" variant="outline" className="w-full"><RotateCcw className="size-4" />Aktife Al</Button>
      </form>
    </div>
  );
}

function Metric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <Card className="p-4 shadow-none">
      <p className="text-xs font-medium uppercase text-[#65705f]">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-[#65705f]">{detail}</p>
    </Card>
  );
}

function Select({ name, options, defaultValue }: { name: string; options: readonly (readonly [string, string])[]; defaultValue?: string }) {
  return (
    <select name={name} defaultValue={defaultValue ?? options[0]?.[0]} className="h-10 rounded border bg-white px-3 text-sm">
      {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
  );
}

function StatusButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="outline" disabled={pending}>{pending ? "Kaydediliyor..." : "Kaydet"}</Button>;
}

function UpdateButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="outline" disabled={pending}>{pending ? "Güncelleniyor..." : "Güncelle"}</Button>;
}

function countLogistics(items: SupplyItem[], status: string) {
  return items.filter((item) => item.logisticsStatus === status).length;
}

function filterItems(items: SupplyItem[], query: string, category: string) {
  const needle = normalizeSearch(query);
  return items.filter((item) => {
    if (category && item.category !== category) return false;
    if (!needle) return true;
    return [item.title, item.description ?? "", item.logisticsNote ?? "", item.category ?? ""].some((value) => normalizeSearch(value).includes(needle));
  });
}

function normalizeSearch(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c");
}

function defaultCategory(section: string) {
  return section === "ACILIS_MALI" ? "ICEBERRY_DEPO" : "DIS_ALIM";
}

function defaultResponsible(section: string) {
  return section === "ACILIS_MALI" ? "ICEBERRY" : "DIS_TEDARIKCI";
}

function formatDateTimeTR(value: Date | string) {
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
