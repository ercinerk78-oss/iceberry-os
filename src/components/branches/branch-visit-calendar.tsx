"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, FileText, Pencil, XCircle } from "lucide-react";

import {
  addBranchVisitNote,
  cancelBranchVisit,
  completeBranchVisit,
  createBranchVisit,
  updateBranchVisit,
} from "@/app/branches/visits/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type BranchVisitCalendarBranch = {
  id: string;
  branchName: string;
  city: string;
};

export type BranchVisitCalendarUser = {
  id: string;
  name: string;
};

export type BranchVisitCalendarItem = {
  id: string;
  branchId: string;
  branchName: string;
  city: string;
  title: string;
  visitType: string;
  plannedAt: string;
  plannedAtInput: string;
  completedAt: string;
  completedAtInput: string;
  status: string;
  derivedStatus: "PLANNED" | "COMPLETED" | "CANCELLED" | "MISSED";
  visitorName: string;
  visitScore: number | null;
  notes: string;
  resultNotes: string;
};

type CalendarDay = {
  key: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
  visits: BranchVisitCalendarItem[];
};

type SummaryItem = {
  label: string;
  count: number;
  percent: number;
  tone: string;
};

type Props = {
  monthLabel: string;
  prevHref: string;
  nextHref: string;
  weeks: CalendarDay[][];
  summary: SummaryItem[];
  branches: BranchVisitCalendarBranch[];
  users: BranchVisitCalendarUser[];
  filters: {
    branchId: string;
    visitorName: string;
    status: string;
  };
};

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

const VISIT_TYPE_OPTIONS = [
  ["OPERATION", "Operasyon Ziyareti"],
  ["QUALITY", "Kalite Kontrol"],
  ["TRAINING", "Eğitim Ziyareti"],
  ["SUPPORT", "Destek Ziyareti"],
  ["OPENING_FOLLOW_UP", "Açılış Sonrası Takip"],
];

const STATUS_OPTIONS = [
  ["PLANNED", "Planlandı"],
  ["COMPLETED", "Gerçekleşti"],
  ["CANCELLED", "İptal Edildi"],
];

const STATUS_LABELS: Record<BranchVisitCalendarItem["derivedStatus"], string> = {
  PLANNED: "Planlandı",
  COMPLETED: "Gerçekleşti",
  CANCELLED: "İptal Edildi",
  MISSED: "Gerçekleşmedi",
};

const STATUS_STYLES: Record<BranchVisitCalendarItem["derivedStatus"], string> = {
  COMPLETED: "border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
  PLANNED: "border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-200",
  CANCELLED: "border-rose-200 bg-rose-100 text-rose-800 hover:bg-rose-200",
  MISSED: "border-rose-200 bg-rose-100 text-rose-800 hover:bg-rose-200",
};

export function BranchVisitCalendar({
  monthLabel,
  prevHref,
  nextHref,
  weeks,
  summary,
  branches,
  users,
  filters,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<BranchVisitCalendarItem | null>(null);
  const userOptions = useMemo(() => users.map((user) => [user.name, user.name] as [string, string]), [users]);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-4">
        <Card className="shadow-none">
          <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-3 lg:justify-start">
              <Button asChild variant="outline" size="icon" aria-label="Önceki ay">
                <Link href={prevHref}><ChevronLeft className="size-4" /></Link>
              </Button>
              <h2 className="min-w-48 text-center text-xl font-semibold">{monthLabel}</h2>
              <Button asChild variant="outline" size="icon" aria-label="Sonraki ay">
                <Link href={nextHref}><ChevronRight className="size-4" /></Link>
              </Button>
            </div>
            <Button type="button" onClick={() => setCreateOpen(true)} className="bg-[#17201b] text-white">
              <CalendarPlus className="size-4" />
              Yeni Ziyaret Planla
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardContent className="p-4">
            <form className="grid gap-3 md:grid-cols-4">
              <Select name="branch" current={filters.branchId} first="Tüm şubeler" options={branches.map((branch) => [branch.id, `${branch.branchName} · ${branch.city}`])} />
              <Select name="responsible" current={filters.visitorName} first="Tüm sorumlular" options={userOptions} />
              <Select name="status" current={filters.status} first="Tüm durumlar" options={[...STATUS_OPTIONS, ["MISSED", "Gerçekleşmedi"]]} />
              <div className="flex gap-2">
                <Button>Filtrele</Button>
                <Button asChild type="button" variant="outline">
                  <Link href="/branch-visits">Temizle</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden shadow-none">
          <div className="overflow-x-auto">
            <div className="min-w-[920px]">
              <div className="grid grid-cols-7 border-b bg-[#f8faf6] text-center text-xs font-semibold uppercase text-[#65705f]">
                {WEEKDAYS.map((day) => <div key={day} className="px-2 py-3">{day}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {weeks.flat().map((day) => (
                  <div key={day.key} className={`min-h-32 border-b border-r p-2 ${day.inMonth ? "bg-white" : "bg-[#f8faf6] text-[#9aa394]"}`}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${day.isToday ? "bg-[#17201b] text-white" : ""}`}>
                        {day.dayNumber}
                      </span>
                      {day.visits.length ? <span className="text-xs text-[#65705f]">{day.visits.length}</span> : null}
                    </div>
                    <div className="space-y-1">
                      {day.visits.slice(0, 4).map((visit) => (
                        <button
                          key={visit.id}
                          type="button"
                          title={`${visit.branchName} - ${STATUS_LABELS[visit.derivedStatus]}`}
                          onClick={() => setSelectedVisit(visit)}
                          className={`block w-full truncate rounded-md border px-2 py-1 text-left text-xs font-medium ${STATUS_STYLES[visit.derivedStatus]}`}
                        >
                          {visit.branchName}
                        </button>
                      ))}
                      {day.visits.length > 4 ? (
                        <button type="button" onClick={() => setSelectedVisit(day.visits[4])} className="text-xs font-medium text-[#2f5f20]">
                          +{day.visits.length - 4} ziyaret
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </section>

      <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Aylık Ziyaret Özeti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.map((item) => (
              <div key={item.label} className={`rounded-lg border p-4 ${item.tone}`}>
                <p className="text-sm font-medium">{item.label}</p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <span className="text-3xl font-semibold">{item.count}</span>
                  <span className="text-lg font-semibold">%{item.percent}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardContent className="p-4 text-sm leading-6 text-[#65705f]">
            Geçmiş tarihli ve hâlâ planlı görünen ziyaretler raporda otomatik olarak “Gerçekleşmedi” kabul edilir; veritabanındaki asıl durum sessizce değiştirilmez.
          </CardContent>
        </Card>
      </aside>

      {createOpen ? (
        <VisitModal title="Yeni Ziyaret Planla" onClose={() => setCreateOpen(false)}>
          <VisitForm branches={branches} userOptions={userOptions} action={createBranchVisit} onSuccess={() => setCreateOpen(false)} />
        </VisitModal>
      ) : null}

      {selectedVisit ? (
        <VisitModal title={selectedVisit.branchName} onClose={() => setSelectedVisit(null)}>
          <VisitDetail visit={selectedVisit} branches={branches} userOptions={userOptions} />
        </VisitModal>
      ) : null}
    </div>
  );
}

function VisitDetail({
  visit,
  branches,
  userOptions,
}: {
  visit: BranchVisitCalendarItem;
  branches: BranchVisitCalendarBranch[];
  userOptions: [string, string][];
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-lg border bg-[#f8faf6] p-4 text-sm md:grid-cols-2">
        <Info label="Şube" value={`${visit.branchName} · ${visit.city}`} />
        <Info label="Tarih / Saat" value={formatDateTime(visit.plannedAt)} />
        <Info label="Sorumlu" value={visit.visitorName || "Atanmadı"} />
        <Info label="Durum" value={STATUS_LABELS[visit.derivedStatus]} />
        <Info label="Ziyaret Tipi" value={VISIT_TYPE_OPTIONS.find(([value]) => value === visit.visitType)?.[1] ?? visit.visitType} />
        <Info label="Gerçekleşme Tarihi" value={visit.completedAt ? formatDateTime(visit.completedAt) : "-"} />
        <Info label="Ziyaret Puanı" value={visit.visitScore == null ? "-" : `%${visit.visitScore}`} />
        <Info label="Not" value={visit.notes || "-"} wide />
        <Info label="Sonuç / Ek Notlar" value={visit.resultNotes || "-"} wide />
      </div>

      <details className="rounded-lg border bg-white p-4">
        <summary className="flex cursor-pointer items-center gap-2 font-semibold"><Pencil className="size-4" />Düzenle</summary>
        <div className="mt-4">
          <VisitForm branches={branches} userOptions={userOptions} visit={visit} action={updateBranchVisit.bind(null, visit.id)} />
        </div>
      </details>

      {visit.status !== "COMPLETED" ? (
        <form action={completeBranchVisit.bind(null, visit.id)} className="grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 md:grid-cols-[1fr_1fr_2fr_auto]">
          <input name="completedAt" type="datetime-local" defaultValue={visit.completedAtInput || visit.plannedAtInput} className="h-10 rounded-lg border bg-white px-3 text-sm" />
          <input name="visitScore" required type="number" min="0" max="100" placeholder="Puan %" className="h-10 rounded-lg border bg-white px-3 text-sm" />
          <input name="resultNotes" placeholder="Gerçekleşme notu" className="h-10 rounded-lg border bg-white px-3 text-sm" />
          <Button className="bg-emerald-700 text-white"><CheckCircle2 className="size-4" />Gerçekleşti</Button>
        </form>
      ) : null}

      {visit.status === "PLANNED" ? (
        <form action={cancelBranchVisit.bind(null, visit.id)} className="grid gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 md:grid-cols-[1fr_auto]">
          <input name="cancellationReason" required placeholder="İptal nedeni" className="h-10 rounded-lg border bg-white px-3 text-sm" />
          <Button variant="destructive"><XCircle className="size-4" />İptal Et</Button>
        </form>
      ) : null}

      <form action={addBranchVisitNote.bind(null, visit.id)} className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[1fr_auto]">
        <input name="note" required placeholder="Yeni not ekle" className="h-10 rounded-lg border bg-white px-3 text-sm" />
        <Button variant="outline"><FileText className="size-4" />Not Ekle</Button>
      </form>
    </div>
  );
}

function VisitForm({
  branches,
  userOptions,
  visit,
  action,
  onSuccess,
}: {
  branches: BranchVisitCalendarBranch[];
  userOptions: [string, string][];
  visit?: BranchVisitCalendarItem;
  action: (formData: FormData) => void | Promise<void>;
  onSuccess?: () => void;
}) {
  async function handleSubmit(formData: FormData) {
    await action(formData);
    onSuccess?.();
  }

  return (
    <form action={handleSubmit} className="grid gap-3 md:grid-cols-2">
      <Select name="branchId" current={visit?.branchId ?? ""} first="Şube seç" options={branches.map((branch) => [branch.id, `${branch.branchName} · ${branch.city}`])} required />
      <input name="plannedAt" type="datetime-local" required defaultValue={visit?.plannedAtInput} className="h-10 rounded-lg border px-3 text-sm" />
      <Select name="visitorName" current={visit?.visitorName ?? ""} first="Sorumlu kullanıcı" options={userOptions} />
      <Select name="visitType" current={visit?.visitType ?? "OPERATION"} first="Ziyaret tipi" options={VISIT_TYPE_OPTIONS} />
      <Select name="status" current={visit?.status ?? "PLANNED"} first="Durum" options={STATUS_OPTIONS} />
      <input name="visitScore" type="number" min="0" max="100" defaultValue={visit?.visitScore ?? ""} placeholder="Ziyaret puanı %" className="h-10 rounded-lg border px-3 text-sm" />
      <input name="title" defaultValue={visit?.title} placeholder="Başlık" className="h-10 rounded-lg border px-3 text-sm" />
      <textarea name="notes" defaultValue={visit?.notes} placeholder="Not" className="min-h-24 rounded-lg border p-3 text-sm md:col-span-2" />
      <div className="flex justify-end md:col-span-2">
        <Button className="bg-[#17201b] text-white">Kaydet</Button>
      </div>
    </form>
  );
}

function VisitModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[#17201b]/45 p-3 md:items-center md:justify-center">
      <div className="max-h-[92vh] w-full overflow-auto rounded-lg bg-white p-5 shadow-xl md:max-w-3xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button type="button" variant="outline" onClick={onClose}>Kapat</Button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Select({
  name,
  current,
  first,
  options,
  required,
}: {
  name: string;
  current: string;
  first: string;
  options: [string, string][] | string[][];
  required?: boolean;
}) {
  return (
    <select name={name} required={required} defaultValue={current} aria-label={first} className="h-10 rounded-lg border px-3 text-sm">
      <option value="">{first}</option>
      {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
  );
}

function Info({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <p className="text-xs font-medium uppercase text-[#65705f]">{label}</p>
      <p className="mt-1 whitespace-pre-line font-medium">{value}</p>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}
