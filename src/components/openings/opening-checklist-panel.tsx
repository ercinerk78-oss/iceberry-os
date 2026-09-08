"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Archive, CheckCircle2, ChevronDown, ClipboardList, FileCheck2, Plus, RotateCcw, Search } from "lucide-react";

import {
  addOpeningDocumentChecklistItem,
  addOpeningSetupChecklistItem,
  archiveOpeningDocumentChecklistItem,
  archiveOpeningSetupChecklistItem,
  completeOpeningSetupChecklistItem,
  ensureOpeningChecklist,
  restoreOpeningSetupChecklistItem,
  setOpeningDocumentChecklistStatus,
  setOpeningSetupChecklistLogisticsStatus,
  setOpeningSetupChecklistStatus,
  updateOpeningSetupChecklistItem,
} from "@/app/openings/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  checklistPercentage,
  documentStatusLabels,
  HIDDEN_OPENING_DOCUMENT_TITLES,
  isOpeningLogisticsCategory,
  OPENING_DOCUMENT_CATEGORIES,
  OPENING_DOCUMENT_STATUSES,
  OPENING_LOGISTICS_STATUSES,
  OPENING_RESPONSIBLE_DEPARTMENTS,
  OPENING_SETUP_CATEGORIES,
  OPENING_SETUP_STATUSES,
  openingLogisticsStatusLabels,
  openingLogisticsStatusProgress,
  responsibleDepartmentLabels,
  setupStatusLabels,
} from "@/lib/opening-checklists";
import type { OpeningState } from "@/lib/validations/opening";

type SetupItem = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  responsibleDepartment: string;
  status: string;
  plannedQuantity: number | null;
  quantityUnit: string | null;
  selectedOption: string | null;
  closingNote: string | null;
  logisticsStatus: string | null;
  logisticsNote: string | null;
  logisticsUpdatedAt: Date | string | null;
  sourceType: string;
  archivedAt: Date | string | null;
  logisticsUpdates?: {
    id: string;
    status: string;
    note: string | null;
    createdAt: Date | string;
  }[];
};

type DocumentItem = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  companyTypeCondition: string | null;
  responsibleDepartment: string;
  status: string;
  note: string | null;
  sourceType: string;
};

const initialState: OpeningState = { success: false, message: "" };

export function OpeningChecklistPanel({
  projectId,
  setupItems,
  documentItems,
  isHotelConcept,
}: {
  projectId: string;
  setupItems: SetupItem[];
  documentItems: DocumentItem[];
  isHotelConcept: boolean;
}) {
  const [setupState, addSetupAction] = useActionState(addOpeningSetupChecklistItem.bind(null, projectId), initialState);
  const [documentState, addDocumentAction] = useActionState(addOpeningDocumentChecklistItem.bind(null, projectId), initialState);
  const [setupSearch, setSetupSearch] = useState("");
  const activeSetupItems = setupItems.filter((item) => !item.archivedAt);
  const passiveSetupItems = setupItems.filter((item) => item.archivedAt);
  const filteredActiveSetupItems = useMemo(() => filterSetupItems(activeSetupItems, setupSearch), [activeSetupItems, setupSearch]);
  const visibleDocumentItems = documentItems.filter((item) => !HIDDEN_OPENING_DOCUMENT_TITLES.includes(item.title as (typeof HIDDEN_OPENING_DOCUMENT_TITLES)[number]));
  const setupPercent = checklistPercentage(activeSetupItems);
  const documentPercent = checklistPercentage(visibleDocumentItems);
  const hasChecklist = activeSetupItems.length || passiveSetupItems.length || visibleDocumentItems.length;

  if (isHotelConcept) {
    return (
      <Card className="p-6 shadow-none">
        <p className="text-sm font-semibold">Hotel konsepti bu kurulum checklist kapsamına dahil değil.</p>
      </Card>
    );
  }

  if (!hasChecklist) {
    return (
      <Card className="p-6 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Kurulum checklisti henüz oluşturulmamış</h2>
            <p className="mt-1 text-sm text-[#65705f]">Standart açılış malzemeleri ve evrak takip listesi bu proje için hazırlanacak.</p>
          </div>
          <form action={ensureOpeningChecklist.bind(null, projectId)}>
            <Button><ClipboardList className="size-4" />Checklist Oluştur</Button>
          </form>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric title="Kurulum İlerlemesi" value={`%${setupPercent}`} detail={`${completedCount(activeSetupItems)} / ${activeSetupItems.length} aktif kalem`} />
        <Metric title="Evrak İlerlemesi" value={`%${documentPercent}`} detail={`${completedDocumentCount(visibleDocumentItems)} / ${visibleDocumentItems.length} evrak`} />
        <Metric title="Yatırımcıda" value={activeSetupItems.filter((item) => item.responsibleDepartment === "INVESTOR" && item.status !== "TAMAMLANDI").length.toString()} detail="Takip edilen açık kalem" />
        <Metric title="Merkezde" value={activeSetupItems.filter((item) => item.responsibleDepartment !== "INVESTOR" && item.status !== "TAMAMLANDI").length.toString()} detail="Departman bekleyen kalem" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-5" />
            <h2 className="text-lg font-semibold">Kurulum Planı</h2>
          </div>
          <SetupAddForm action={addSetupAction} state={setupState} />
          <SetupSearch value={setupSearch} onChange={setSetupSearch} total={activeSetupItems.length} resultCount={filteredActiveSetupItems.length} />
          <GroupedSetupItems items={filteredActiveSetupItems} search={setupSearch} />
          <PassiveSetupItems items={passiveSetupItems} />
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FileCheck2 className="size-5" />
            <h2 className="text-lg font-semibold">Evrak ve Yapılacaklar</h2>
          </div>
          <DocumentAddForm action={addDocumentAction} state={documentState} />
          <GroupedDocumentItems items={visibleDocumentItems} />
        </section>
      </div>
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

function SetupAddForm({ action, state }: { action: (payload: FormData) => void; state: OpeningState }) {
  return (
    <Card className="p-4 shadow-none">
      <form action={action} className="grid gap-3 lg:grid-cols-[1fr_1.4fr_1fr_1fr_auto]">
        <Select name="category" options={OPENING_SETUP_CATEGORIES.map((item) => [item, item])} />
        <input name="title" required placeholder="Yeni kurulum kalemi" className="h-10 rounded border px-3 text-sm" />
        <Select name="responsibleDepartment" options={OPENING_RESPONSIBLE_DEPARTMENTS} defaultValue="OPERATIONS" />
        <Select name="status" options={OPENING_SETUP_STATUSES} defaultValue="BEKLIYOR" />
        <Button><Plus className="size-4" />Ekle</Button>
        <input name="plannedQuantity" inputMode="decimal" placeholder="Planlanan adet" className="h-10 rounded border px-3 text-sm" />
        <input name="quantityUnit" defaultValue="Adet" placeholder="Birim" className="h-10 rounded border px-3 text-sm" />
        <input name="description" placeholder="Açıklama" className="h-10 rounded border px-3 text-sm lg:col-span-3" />
      </form>
      {state.message ? <p className={`mt-2 text-sm ${state.success ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
    </Card>
  );
}

function DocumentAddForm({ action, state }: { action: (payload: FormData) => void; state: OpeningState }) {
  return (
    <Card className="p-4 shadow-none">
      <form action={action} className="grid gap-3 md:grid-cols-2">
        <Select name="category" options={OPENING_DOCUMENT_CATEGORIES.map((item) => [item, item])} />
        <Select name="status" options={OPENING_DOCUMENT_STATUSES} defaultValue="TALEP_EDILDI" />
        <input name="title" required placeholder="Yeni evrak kalemi" className="h-10 rounded border px-3 text-sm md:col-span-2" />
        <Select name="responsibleDepartment" options={OPENING_RESPONSIBLE_DEPARTMENTS} defaultValue="OPERATIONS" />
        <input name="companyTypeCondition" placeholder="Şart" className="h-10 rounded border px-3 text-sm" />
        <input name="description" placeholder="Açıklama" className="h-10 rounded border px-3 text-sm md:col-span-2" />
        <Button className="md:col-span-2"><Plus className="size-4" />Evrak Ekle</Button>
      </form>
      {state.message ? <p className={`mt-2 text-sm ${state.success ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
    </Card>
  );
}

function SetupSearch({ value, onChange, total, resultCount }: { value: string; onChange: (value: string) => void; total: number; resultCount: number }) {
  return (
    <Card className="p-4 shadow-none">
      <label className="relative block">
        <Search className="absolute left-3 top-3 size-4 text-[#65705f]" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Görev veya iş kalemi ara"
          className="h-10 w-full rounded border bg-white pl-9 pr-3 text-sm"
        />
      </label>
      <p className="mt-2 text-xs text-[#65705f]">{value.trim() ? `${resultCount} sonuç gösteriliyor` : `${total} aktif kalem kategori altında listeleniyor`}</p>
    </Card>
  );
}

function GroupedSetupItems({ items, search }: { items: SetupItem[]; search: string }) {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const isSearching = Boolean(search.trim());
  if (!items.length) {
    return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-[#65705f]">Aramaya uygun aktif kurulum kalemi bulunamadı.</p>;
  }

  return (
    <div className="space-y-4">
      {groupByCategory(items).map(([category, categoryItems]) => {
        const isOpen = isSearching || Boolean(openCategories[category]);
        const percent = checklistPercentage(categoryItems);
        return (
        <Card key={category} className="p-4 shadow-none">
          <button
            type="button"
            onClick={() => setOpenCategories((current) => ({ ...current, [category]: !current[category] }))}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span>
              <span className="block font-semibold">{category}</span>
              <span className="mt-1 block text-sm text-[#65705f]">{completedCount(categoryItems)} / {categoryItems.length} kalem tamamlandı</span>
            </span>
            <span className="flex items-center gap-2">
              <Badge variant={percent === 100 ? "default" : "secondary"}>%{percent}</Badge>
              <ChevronDown className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </span>
          </button>
          {isOpen ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {categoryItems.map((item) => <SetupItemCard key={item.id} item={item} />)}
            </div>
          ) : null}
        </Card>
        );
      })}
    </div>
  );
}

function PassiveSetupItems({ items }: { items: SetupItem[] }) {
  if (!items.length) return null;
  return (
    <details className="rounded-lg border bg-white p-4">
      <summary className="cursor-pointer font-semibold">Pasif Kalemler ({items.length})</summary>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border bg-[#fbfcf8] p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="mt-1 text-xs text-[#65705f]">{item.category} · {item.plannedQuantity ?? "-"} {item.quantityUnit || "Adet"}</p>
              </div>
              <Badge variant="outline">Pasif</Badge>
            </div>
            <form action={restoreOpeningSetupChecklistItem.bind(null, item.id)} className="mt-3">
              <Button type="submit" variant="outline" className="w-full"><RotateCcw className="size-4" />Aktife Al</Button>
            </form>
          </div>
        ))}
      </div>
    </details>
  );
}

function SetupItemCard({ item }: { item: SetupItem }) {
  const isCompleted = item.status === "TAMAMLANDI";
  const hasLogisticsTracking = isOpeningLogisticsCategory(item.category);

  return (
    <div className={`rounded-lg border p-3 ${isCompleted ? "border-emerald-200 bg-emerald-50/70" : "bg-[#fbfcf8]"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{item.title}</p>
          {item.description ? <p className="mt-1 text-sm text-[#65705f]">{item.description}</p> : null}
        </div>
        <Badge className={item.responsibleDepartment === "INVESTOR" ? "bg-amber-100 text-amber-800" : ""}>
          {responsibleDepartmentLabels[item.responsibleDepartment] ?? item.responsibleDepartment}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge className={isCompleted ? "bg-emerald-600 text-white" : ""} variant={isCompleted ? "default" : "secondary"}>{setupStatusLabels[item.status] ?? item.status}</Badge>
        <Badge variant="outline">{item.sourceType === "MANUAL" ? "Manuel" : "Standart"}</Badge>
        {item.plannedQuantity != null ? <Badge variant="outline">Planlanan {item.plannedQuantity} {item.quantityUnit || "Adet"}</Badge> : null}
      </div>
      {item.closingNote ? <p className="mt-3 rounded bg-white p-2 text-sm text-[#65705f]">{item.closingNote}</p> : null}
      <SetupItemEditForm item={item} />
      {hasLogisticsTracking ? <LogisticsStatusPanel item={item} /> : null}
      <div className="mt-3 grid gap-2">
        <form action={setOpeningSetupChecklistStatus.bind(null, item.id)} className="grid gap-2">
          <Select name="status" options={OPENING_SETUP_STATUSES} defaultValue={item.status} />
          <select name="selectedOption" defaultValue={item.selectedOption ?? ""} className="h-10 rounded border px-3 text-sm">
            <option value="">Sorumlu / işlem tipi</option>
            <option value="MERKEZ_TAMAMLADI">Merkez tamamladı</option>
            <option value="YATIRIMCI_TAMAMLADI">Yatırımcı tamamladı, merkez teyit etti</option>
            <option value="YATIRIMCI_COZECEK">Yatırımcı çözecek</option>
            <option value="SATIN_ALINDI">Alım yapıldı</option>
            <option value="IMALATA_ALINDI">İmalata alındı</option>
          </select>
          <textarea name="closingNote" defaultValue={item.closingNote ?? ""} placeholder="Güncelleme veya düzeltme notu" className="min-h-16 rounded border px-3 py-2 text-sm" />
          <OpeningStatusSubmitButton />
        </form>
        {!isCompleted ? (
          <form action={completeOpeningSetupChecklistItem.bind(null, item.id)} className="grid gap-2">
            <select name="selectedOption" defaultValue="" className="h-10 rounded border px-3 text-sm">
              <option value="">Tamamlama tipi</option>
              <option value="MERKEZ_TAMAMLADI">Merkez tamamladı</option>
              <option value="YATIRIMCI_TAMAMLADI">Yatırımcı tamamladı, merkez teyit etti</option>
              <option value="YATIRIMCI_COZECEK">Yatırımcı çözecek</option>
              <option value="SATIN_ALINDI">Alım yapıldı</option>
            </select>
            <textarea name="closingNote" required placeholder="Tamamlama notu" className="min-h-20 rounded border px-3 py-2 text-sm" />
            <OpeningCompleteSubmitButton />
          </form>
        ) : null}
        <form action={archiveOpeningSetupChecklistItem.bind(null, item.id)}>
          <Button type="submit" variant="outline" className="w-full"><Archive className="size-4" />Pasife Al</Button>
        </form>
      </div>
    </div>
  );
}

function SetupItemEditForm({ item }: { item: SetupItem }) {
  const [state, action] = useActionState(updateOpeningSetupChecklistItem.bind(null, item.id), initialState);
  return (
    <details className="mt-3 rounded-lg border bg-white p-3">
      <summary className="cursor-pointer text-sm font-semibold">Kalem bilgilerini düzenle</summary>
      <form action={action} className="mt-3 grid gap-2">
        <Select name="category" options={OPENING_SETUP_CATEGORIES.map((category) => [category, category])} defaultValue={item.category} />
        <input name="title" required defaultValue={item.title} placeholder="Kalem adı" className="h-10 rounded border px-3 text-sm" />
        <div className="grid gap-2 sm:grid-cols-2">
          <input name="plannedQuantity" inputMode="decimal" defaultValue={item.plannedQuantity ?? ""} placeholder="Planlanan adet" className="h-10 rounded border px-3 text-sm" />
          <input name="quantityUnit" defaultValue={item.quantityUnit || "Adet"} placeholder="Birim" className="h-10 rounded border px-3 text-sm" />
        </div>
        <Select name="responsibleDepartment" options={OPENING_RESPONSIBLE_DEPARTMENTS} defaultValue={item.responsibleDepartment} />
        <Select name="status" options={OPENING_SETUP_STATUSES} defaultValue={item.status} />
        <textarea name="description" defaultValue={item.description ?? ""} placeholder="Açıklama" className="min-h-16 rounded border px-3 py-2 text-sm" />
        <OpeningItemUpdateSubmitButton />
      </form>
      {state.message ? <p className={`mt-2 text-sm ${state.success ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
    </details>
  );
}

function LogisticsStatusPanel({ item }: { item: SetupItem }) {
  const currentLabel = item.logisticsStatus ? (openingLogisticsStatusLabels[item.logisticsStatus] ?? item.logisticsStatus) : "Süreç başlamadı";
  const progress = item.logisticsStatus ? (openingLogisticsStatusProgress[item.logisticsStatus] ?? 0) : 0;
  const updates = item.logisticsUpdates ?? [];

  return (
    <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase text-sky-900">Tedarik durumu</p>
          <p className="text-sm font-semibold text-sky-950">{currentLabel}</p>
        </div>
        <Badge className={item.logisticsStatus === "TESLIM_EDILDI" ? "bg-emerald-600 text-white" : "bg-sky-100 text-sky-900"}>%{progress}</Badge>
      </div>
      <div className="mt-2 h-2 rounded bg-white">
        <div className="h-2 rounded bg-sky-600" style={{ width: `${progress}%` }} />
      </div>
      {item.logisticsNote ? <p className="mt-2 rounded bg-white p-2 text-sm text-[#65705f]">{item.logisticsNote}</p> : null}
      {updates.length ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold uppercase text-sky-900">Son durum geçmişi</p>
          {updates.map((update) => (
            <div key={update.id} className="rounded bg-white p-2 text-xs text-[#65705f]">
              <span className="font-semibold text-[#132117]">{openingLogisticsStatusLabels[update.status] ?? update.status}</span>
              <span> · {formatDateTimeTR(update.createdAt)}</span>
              {update.note ? <p className="mt-1">{update.note}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
      <form action={setOpeningSetupChecklistLogisticsStatus.bind(null, item.id)} className="mt-3 grid gap-2">
        <Select name="logisticsStatus" options={OPENING_LOGISTICS_STATUSES} defaultValue={item.logisticsStatus ?? "SIPARIS"} />
        <textarea name="logisticsNote" defaultValue={item.logisticsNote ?? ""} placeholder="Tedarik / depo notu" className="min-h-16 rounded border px-3 py-2 text-sm" />
        <OpeningLogisticsSubmitButton />
      </form>
    </div>
  );
}

function OpeningStatusSubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="outline" disabled={pending}>{pending ? "Güncelleniyor..." : "Durumu Güncelle"}</Button>;
}

function OpeningItemUpdateSubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="outline" disabled={pending}>{pending ? "Kaydediliyor..." : "Kalemi Güncelle"}</Button>;
}

function OpeningLogisticsSubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="outline" disabled={pending}>{pending ? "Kaydediliyor..." : "Tedarik Durumunu Kaydet"}</Button>;
}

function OpeningCompleteSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="bg-emerald-600 text-white hover:bg-emerald-700">
      <CheckCircle2 className="size-4" />
      {pending ? "Tamamlanıyor..." : "Tamamla"}
    </Button>
  );
}

function GroupedDocumentItems({ items }: { items: DocumentItem[] }) {
  return (
    <div className="space-y-4">
      {groupByCategory(items).map(([category, categoryItems]) => (
        <Card key={category} className="p-4 shadow-none">
          <h3 className="font-semibold">{category}</h3>
          <div className="mt-3 space-y-3">
            {categoryItems.map((item) => <DocumentItemCard key={item.id} item={item} />)}
          </div>
        </Card>
      ))}
    </div>
  );
}

function DocumentItemCard({ item }: { item: DocumentItem }) {
  return (
    <div className="rounded-lg border bg-[#fbfcf8] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{item.title}</p>
          {item.companyTypeCondition ? <p className="mt-1 text-xs text-[#65705f]">{item.companyTypeCondition}</p> : null}
          {item.description ? <p className="mt-1 text-sm text-[#65705f]">{item.description}</p> : null}
        </div>
        <Badge>{documentStatusLabels[item.status] ?? item.status}</Badge>
      </div>
      {item.note ? <p className="mt-3 rounded bg-white p-2 text-sm text-[#65705f]">{item.note}</p> : null}
      <form action={setOpeningDocumentChecklistStatus.bind(null, item.id)} className="mt-3 grid gap-2">
        <Select name="status" options={OPENING_DOCUMENT_STATUSES} defaultValue={item.status} />
        <textarea name="note" placeholder="Evrak notu" className="min-h-16 rounded border px-3 py-2 text-sm" />
        <Button type="submit" variant="outline">Evrak Durumunu Güncelle</Button>
      </form>
      <form action={archiveOpeningDocumentChecklistItem.bind(null, item.id)} className="mt-2">
        <Button type="submit" variant="outline" className="w-full"><Archive className="size-4" />Listeden Kaldır</Button>
      </form>
    </div>
  );
}

function Select({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: readonly (readonly [string, string])[];
  defaultValue?: string;
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? options[0]?.[0]} className="h-10 rounded border px-3 text-sm">
      {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
  );
}

function groupByCategory<T extends { category: string }>(items: T[]) {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const current = grouped.get(item.category) ?? [];
    current.push(item);
    grouped.set(item.category, current);
  }
  return Array.from(grouped.entries());
}

function filterSetupItems(items: SetupItem[], query: string) {
  const needle = normalizeSearch(query);
  if (!needle) return items;
  return items.filter((item) =>
    [
      item.category,
      item.title,
      item.description ?? "",
      item.closingNote ?? "",
      item.logisticsNote ?? "",
      responsibleDepartmentLabels[item.responsibleDepartment] ?? item.responsibleDepartment,
    ].some((value) => normalizeSearch(value).includes(needle)),
  );
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

function completedCount(items: SetupItem[]) {
  return items.filter((item) => item.status === "TAMAMLANDI").length;
}

function completedDocumentCount(items: DocumentItem[]) {
  return items.filter((item) => ["KONTROL_EDILDI", "GEREKLI_DEGIL"].includes(item.status)).length;
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
