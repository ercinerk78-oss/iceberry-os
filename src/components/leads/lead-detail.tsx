"use client";

import Link from "next/link";
import type React from "react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MatchStatus } from "@prisma/client";
import { ArrowRight, CalendarClock, CheckCircle2, Clock3, Pencil, Phone, Send, X } from "lucide-react";

import { addLeadActivity } from "@/app/leads/actions";
import { changeLeadCategoryForm, changeLeadStatusForm, convertLeadForm } from "@/app/leads/form-actions";
import { unlinkLocationMatch } from "@/app/locations/actions";
import { LeadForm } from "@/components/leads/lead-form";
import { LeadLocationLinkForm, MatchUpdateForm } from "@/components/locations/location-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { appointmentStatusLabel, appointmentTypeLabel } from "@/lib/appointments";
import { formatDate } from "@/lib/candidates";
import { hasReport, locationStatusLabel, matchStatusLabel, money, numberTR } from "@/lib/locations";
import {
  INVALID_LEAD_REASON_LABELS,
  LEAD_ACTIVITY_TYPES,
  LEAD_CATEGORIES,
  LEAD_CATEGORY_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  leadCategoryLabel,
  leadStatusLabel,
  type LeadView,
} from "@/lib/leads";
import type { LeadActionState } from "@/lib/validations/lead";

const initial: LeadActionState = { success: false, message: "" };
const baseTabs = ["Genel Bilgiler", "Arama Geçmişi", "Randevular", "Görevler", "Zaman Çizelgesi", "Notlar"] as const;
const tabs = [...baseTabs.slice(0, 2), "Aday Lokasyonlar", ...baseTabs.slice(2)] as const;

export function LeadDetail({ lead, availableLocations = [] }: { lead: LeadView; availableLocations?: { id: string; name: string; city: string; district: string | null }[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Genel Bilgiler");
  const [edit, setEdit] = useState(false);
  const [categoryValue, setCategoryValue] = useState(lead.leadCategory || "POSITIVE");
  const [state, activityAction, activityPending] = useActionState(addLeadActivity.bind(null, lead.id), initial);
  const [statusState, statusAction, statusPending] = useActionState(changeLeadStatusForm.bind(null, lead.id), initial);
  const [categoryState, categoryAction, categoryPending] = useActionState(changeLeadCategoryForm.bind(null, lead.id), initial);
  const [convertState, convertAction, convertPending] = useActionState(convertLeadForm.bind(null, lead.id), initial);

  useEffect(() => {
    if (convertState.success && convertState.candidateId) router.push(`/candidates/${convertState.candidateId}`);
  }, [convertState, router]);

  const conceptText = lead.concepts.map((concept) => concept.name).join(", ") || lead.requestedConcept;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#dfe4dc] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-sky-100 text-sky-700">{leadStatusLabel(lead.processStatus || lead.status)}</Badge>
              <Badge variant="secondary">{lead.source}</Badge>
              <Badge variant="secondary">{leadCategoryLabel(lead.leadCategory)}</Badge>
              {lead.manualOverrideFields.length ? <Badge className="bg-amber-100 text-amber-800">Manuel düzenlendi</Badge> : null}
            </div>
            <h2 className="mt-4 text-2xl font-semibold">{lead.fullName}</h2>
            <p className="mt-1 text-sm text-[#65705f]">{lead.city} · {conceptText}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setEdit(true)}>
              <Pencil className="size-4" />
              Düzenle
            </Button>
            {lead.convertedCandidateId ? (
              <Link href={`/candidates/${lead.convertedCandidateId}`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-100 px-3 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="size-4" />
                Adayı Aç
              </Link>
            ) : (
              <form action={convertAction}>
                <Button type="submit" disabled={convertPending} className="bg-[#17201b] text-white">
                  Franchise Adayına Dönüştür
                  <ArrowRight className="size-4" />
                </Button>
              </form>
            )}
          </div>
        </div>
        {convertState.message ? <p role="status" className={`mt-4 rounded-lg p-3 text-sm ${convertState.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{convertState.message}</p> : null}
      </div>

      <div className="rounded-lg border border-[#dfe4dc] bg-white">
        <nav className="flex gap-2 overflow-x-auto border-b p-3">
          {tabs.map((item) => (
            <Button key={item} type="button" variant={tab === item ? "default" : "outline"} onClick={() => setTab(item)} className="shrink-0">{item}</Button>
          ))}
        </nav>
        <div className="p-5">
          {tab === "Genel Bilgiler" ? (
            <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
              <div className="grid gap-3 md:grid-cols-2">
                <Info label="Telefon" value={lead.phone} />
                <Info label="E-posta" value={lead.email || "—"} />
                <Info label="Şehir" value={lead.city} />
                <Info label="Lead Tarihi" value={formatDate(lead.leadDate)} />
                <Info label="Kaynak" value={lead.source} />
                <Info label="Talep Edilen Konseptler" value={conceptText} />
                <Info label="Süreç Durumu" value={leadStatusLabel(lead.processStatus || lead.status)} />
                <Info label="Lead Kategorisi" value={leadCategoryLabel(lead.leadCategory)} />
                <Info label="Hatalı Form Gerekçesi" value={lead.invalidReason ? INVALID_LEAD_REASON_LABELS[lead.invalidReason as keyof typeof INVALID_LEAD_REASON_LABELS] ?? lead.invalidReason : "—"} />
                <Info label="Yatırım Bütçesi" value={lead.investmentBudget || "Belirtilmedi"} />
                <Info label="Açıklama" value={lead.description || "Belirtilmedi"} />
                <Info label="İlgilenilen Lokasyon" value={lead.interestedLocation || "Belirtilmedi"} />
                <Info label="Atanan Sorumlu" value={lead.assignedUserId || "Atanmadı"} />
                <Info label="Son Temas" value={lead.lastContactAt ? formatDate(lead.lastContactAt) : "Henüz yok"} />
                <Info label="Sonraki Takip" value={lead.nextFollowUpAt ? formatDate(lead.nextFollowUpAt) : "Planlanmadı"} />
              </div>
              <div className="space-y-4">
                <LeadStatusForm lead={lead} action={statusAction} pending={statusPending} state={statusState} />
                <LeadCategoryForm
                  lead={lead}
                  action={categoryAction}
                  pending={categoryPending}
                  state={categoryState}
                  categoryValue={categoryValue}
                  setCategoryValue={setCategoryValue}
                />
              </div>
            </div>
          ) : null}

          {tab === "Arama Geçmişi" ? <List empty="Arama kaydı yok." items={lead.activities.filter((activity) => activity.type.includes("Telefon") || activity.type.includes("Arama"))} render={(activity) => <TimelineItem key={activity.id} title={activity.type} date={activity.createdAt} description={activity.description} />} /> : null}
          {tab === "Aday Lokasyonlar" ? <LocationMatches lead={lead} availableLocations={availableLocations} /> : null}
          {tab === "Randevular" ? <Appointments lead={lead} /> : null}
          {tab === "Görevler" ? <Tasks lead={lead} /> : null}
          {tab === "Zaman Çizelgesi" ? <List empty="Zaman çizelgesi kaydı yok." items={lead.activities} render={(activity) => <TimelineItem key={activity.id} title={activity.type} date={activity.createdAt} description={activity.description} />} /> : null}
          {tab === "Notlar" ? <ActivityForm action={activityAction} state={state} pending={activityPending} /> : null}
        </div>
      </div>

      {edit ? (
        <Modal title="Lead'i Düzenle" onClose={() => setEdit(false)}>
          <LeadForm lead={lead} onCancel={() => setEdit(false)} onSuccess={() => setEdit(false)} />
        </Modal>
      ) : null}
    </div>
  );
}

function LeadStatusForm({ lead, action, pending, state }: { lead: LeadView; action: (payload: FormData) => void; pending: boolean; state: LeadActionState }) {
  return (
    <form action={action} className="rounded-lg border border-[#dfe4dc] bg-[#f8faf6] p-5">
      <h3 className="font-semibold">Lead Durumu</h3>
      <p className="mt-1 text-sm text-[#65705f]">Süreç durumu ile değerlendirme kategorisi ayrı tutulur.</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <select aria-label="Lead durumu" name="status" defaultValue={lead.processStatus || lead.status} disabled={!!lead.convertedCandidateId} className="h-10 min-w-0 flex-1 rounded-lg border bg-white px-3 text-sm">
          {LEAD_STATUSES.map((item) => <option key={item} value={item}>{LEAD_STATUS_LABELS[item]}</option>)}
        </select>
        <Button type="submit" disabled={pending || !!lead.convertedCandidateId} className="bg-[#17201b] text-white">Durumu Kaydet</Button>
      </div>
      {state.message ? <p className={`mt-3 rounded-lg p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{state.message}</p> : null}
    </form>
  );
}

function LeadCategoryForm({ lead, action, pending, state, categoryValue, setCategoryValue }: { lead: LeadView; action: (payload: FormData) => void; pending: boolean; state: LeadActionState; categoryValue: string; setCategoryValue: (value: string) => void }) {
  return (
    <form action={action} className="rounded-lg border border-[#dfe4dc] bg-[#f8faf6] p-5">
      <h3 className="font-semibold">Lead Kategorisi</h3>
      <p className="mt-1 text-sm text-[#65705f]">Hatalı form seçilirse gerekçe üretim raporlarında kullanılacaktır.</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <select aria-label="Lead kategorisi" name="leadCategory" value={categoryValue} onChange={(event) => setCategoryValue(event.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border bg-white px-3 text-sm">
          {LEAD_CATEGORIES.map((item) => <option key={item} value={item}>{LEAD_CATEGORY_LABELS[item]}</option>)}
        </select>
        <Button type="submit" disabled={pending} className="bg-[#17201b] text-white">Kategoriyi Kaydet</Button>
      </div>
      {categoryValue === "INVALID_FORM" ? (
        <div className="mt-3 grid gap-3">
          <select aria-label="Hatalı form gerekçesi" name="invalidReason" defaultValue={lead.invalidReason || "WRONG_PHONE"} className="h-10 rounded-lg border bg-white px-3 text-sm">
            {Object.entries(INVALID_LEAD_REASON_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <textarea aria-label="Hatalı form açıklaması" name="invalidReasonDetail" defaultValue={lead.invalidReasonDetail} rows={3} placeholder="Yanlış numara, eksik bilgi veya diğer geçersizlik detayını yazın" className="rounded-lg border bg-white p-3 text-sm" />
        </div>
      ) : null}
      {state.message ? <p className={`mt-3 rounded-lg p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{state.message}</p> : null}
    </form>
  );
}

function LocationMatches({ lead, availableLocations }: { lead: LeadView; availableLocations: { id: string; name: string; city: string; district: string | null }[] }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
      <LeadLocationLinkForm leadId={lead.id} leads={[{ id: lead.id, fullName: lead.fullName, city: lead.city, phone: lead.phone }]} locations={availableLocations} />
      <List
        empty="Bu lead'e henüz aday lokasyon bağlanmadı."
        items={lead.candidateLocations ?? []}
        render={(match) => {
          const report = match.location.documents.find((document) => ["LOCATION_ANALYSIS_PDF", "LOCATION_ANALYSIS_JPEG"].includes(document.documentType));

          return (
            <article key={match.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/locations/${match.location.id}`} className="font-semibold hover:underline">{match.location.name}</Link>
                  <p className="mt-1 text-sm text-[#65705f]">{match.location.city}{match.location.district ? ` / ${match.location.district}` : ""} · {numberTR(match.location.areaM2, " m²")} · {money(match.location.monthlyRent)} kira · {money(match.location.transferFee)} devir</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge>{matchStatusLabel(match.matchStatus)}</Badge>
                    <Badge variant="secondary">{locationStatusLabel(match.location.status)}</Badge>
                    <Badge className={hasReport(match.location.documents) ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{hasReport(match.location.documents) ? "Rapor Hazır" : "Rapor Bekleniyor"}</Badge>
                    {match.nextFollowUpAt ? <Badge variant="secondary">Takip: {formatDate(match.nextFollowUpAt)}</Badge> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {report ? <Button asChild size="sm" variant="outline"><a href={`/api/locations/documents/${report.fileName}`} target="_blank">Raporu Aç</a></Button> : null}
                  <form action={unlinkLocationMatch.bind(null, match.id)}><Button size="sm" variant="outline">Bağlantıyı Kaldır</Button></form>
                </div>
              </div>
              <div className="mt-4"><MatchUpdateForm match={{ id: match.id, matchStatus: match.matchStatus as MatchStatus, nextFollowUpAt: match.nextFollowUpAt ? new Date(match.nextFollowUpAt) : null, notes: match.notes }} /></div>
            </article>
          );
        }}
      />
    </div>
  );
}

function Appointments({ lead }: { lead: LeadView }) {
  return <List empty="Randevu kaydı yok." items={lead.appointments ?? []} render={(appointment) => <div key={appointment.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4"><div className="flex flex-wrap gap-2"><Badge>{appointmentStatusLabel(appointment.status)}</Badge><Badge variant="secondary">{appointmentTypeLabel(appointment.appointmentType)}</Badge></div><h3 className="mt-3 font-semibold">{appointment.title}</h3><p className="mt-1 text-sm text-[#65705f]">{formatDate(appointment.appointmentDate)} · {appointment.assignedUserId}</p>{appointment.outcome ? <p className="mt-2 text-sm">{appointment.outcome}</p> : null}</div>} />;
}

function Tasks({ lead }: { lead: LeadView }) {
  return <List empty="Görev kaydı yok." items={lead.tasks ?? []} render={(task) => <div key={task.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4"><div className="flex flex-wrap gap-2"><Badge>{task.status}</Badge><Badge variant="secondary">{task.priority}</Badge></div><h3 className="mt-3 font-semibold">{task.title}</h3><p className="mt-1 text-sm text-[#65705f]"><CalendarClock className="mr-1 inline size-4" />{formatDate(task.dueDate)} · {task.assignedUserId}</p>{task.description ? <p className="mt-2 text-sm">{task.description}</p> : null}</div>} />;
}

function ActivityForm({ action, state, pending }: { action: (payload: FormData) => void; state: LeadActionState; pending: boolean }) {
  return (
    <form action={action} className="grid gap-3">
      <select aria-label="Aktivite türü" name="type" className="h-10 rounded-lg border px-3 text-sm">{LEAD_ACTIVITY_TYPES.map((item) => <option key={item}>{item}</option>)}</select>
      <textarea aria-label="Aktivite açıklaması" required name="description" rows={4} placeholder="Görüşme veya not detayını yazın" className="rounded-lg border bg-[#f8faf6] p-3 text-sm" />
      {state.message ? <p className={`rounded-lg p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{state.message}</p> : null}
      <Button type="submit" disabled={pending} className="justify-self-end bg-[#17201b] text-white"><Send className="size-4" />{pending ? "Kaydediliyor..." : "Notu Kaydet"}</Button>
    </form>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4"><p className="text-xs font-medium uppercase text-[#65705f]">{label}</p><p className="mt-2 whitespace-pre-wrap text-sm font-semibold">{value}</p></div>;
}

function TimelineItem({ title, date, description }: { title: string; date: string; description: string }) {
  return <div className="relative flex gap-3"><div className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#17201b] text-[#a8ff60]">{title.includes("Telefon") ? <Phone className="size-4" /> : <Clock3 className="size-4" />}</div><div className="min-w-0 flex-1 rounded-lg bg-[#f8faf6] p-3"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-sm leading-6 text-[#65705f]">{description}</p><time className="mt-2 block text-xs text-[#8a9484]">{formatDate(date)}</time></div></div>;
}

function List<T>({ items, render, empty }: { items: T[]; render: (item: T) => React.ReactNode; empty: string }) {
  if (!items.length) return <p className="py-8 text-center text-sm text-[#65705f]">{empty}</p>;
  return <div className="space-y-3">{items.map(render)}</div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-end bg-[#17201b]/40 p-3 backdrop-blur-sm md:items-center md:justify-center"><div className="max-h-[92vh] w-full overflow-auto rounded-lg bg-white md:max-w-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4"><h3 className="text-lg font-semibold">{title}</h3><Button size="icon" variant="ghost" onClick={onClose}><X className="size-4" /></Button></div>{children}</div></div>;
}
