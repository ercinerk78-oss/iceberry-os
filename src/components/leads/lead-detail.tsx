"use client";

import Link from "next/link";
import type React from "react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarClock, CheckCircle2, Clock3, Phone, Send } from "lucide-react";

import { addLeadActivity } from "@/app/leads/actions";
import { changeLeadCategoryForm, changeLeadStatusForm, convertLeadForm } from "@/app/leads/form-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { appointmentStatusLabel, appointmentTypeLabel } from "@/lib/appointments";
import { formatDate } from "@/lib/candidates";
import {
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
const tabs = ["Genel Bilgiler", "Arama Geçmişi", "Randevular", "Görevler", "Zaman Çizelgesi", "Notlar"] as const;

export function LeadDetail({ lead }: { lead: LeadView }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Genel Bilgiler");
  const [state, activityAction, activityPending] = useActionState(addLeadActivity.bind(null, lead.id), initial);
  const [statusState, statusAction, statusPending] = useActionState(changeLeadStatusForm.bind(null, lead.id), initial);
  const [categoryState, categoryAction, categoryPending] = useActionState(changeLeadCategoryForm.bind(null, lead.id), initial);
  const [convertState, convertAction, convertPending] = useActionState(convertLeadForm.bind(null, lead.id), initial);

  useEffect(() => {
    if (convertState.success && convertState.candidateId) router.push(`/candidates/${convertState.candidateId}`);
  }, [convertState, router]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#dfe4dc] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-sky-100 text-sky-700">{leadStatusLabel(lead.processStatus || lead.status)}</Badge>
              <Badge variant="secondary">{lead.source}</Badge>
              <Badge variant="secondary">{leadCategoryLabel(lead.leadCategory)}</Badge>
            </div>
            <h2 className="mt-4 text-2xl font-semibold">{lead.fullName}</h2>
            <p className="mt-1 text-sm text-[#65705f]">
              {lead.city} · {lead.requestedConcept}
            </p>
          </div>
          {lead.convertedCandidateId ? (
            <Link
              href={`/candidates/${lead.convertedCandidateId}`}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-100 px-3 text-sm font-medium text-emerald-700"
            >
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
        {convertState.message ? (
          <p role="status" className={`mt-4 rounded-lg p-3 text-sm ${convertState.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {convertState.message}
          </p>
        ) : null}
      </div>

      <div className="rounded-lg border border-[#dfe4dc] bg-white">
        <nav className="flex gap-2 overflow-x-auto border-b p-3">
          {tabs.map((item) => (
            <Button key={item} type="button" variant={tab === item ? "default" : "outline"} onClick={() => setTab(item)} className="shrink-0">
              {item}
            </Button>
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
                <Info label="Talep Edilen Konsept" value={lead.requestedConcept} />
                <Info label="Süreç Durumu" value={leadStatusLabel(lead.processStatus || lead.status)} />
                <Info label="Lead Kategorisi" value={leadCategoryLabel(lead.leadCategory)} />
                <Info label="Yatırım Bütçesi" value={lead.investmentBudget || "Belirtilmedi"} />
                <Info label="İlgilenilen Lokasyon" value={lead.interestedLocation || "Belirtilmedi"} />
                <Info label="Atanan Sorumlu" value={lead.assignedUserId || "Atanmadı"} />
                <Info label="Son Temas" value={lead.lastContactAt ? formatDate(lead.lastContactAt) : "Henüz yok"} />
                <Info label="Sonraki Takip" value={lead.nextFollowUpAt ? formatDate(lead.nextFollowUpAt) : "Planlanmadı"} />
              </div>
              <form action={statusAction} className="rounded-lg border border-[#dfe4dc] bg-[#f8faf6] p-5">
                <h3 className="font-semibold">Lead Durumu</h3>
                <p className="mt-1 text-sm text-[#65705f]">Süreç durumu ile değerlendirme kategorisi ayrı tutulur.</p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <select
                    aria-label="Lead durumu"
                    name="status"
                    defaultValue={lead.processStatus || lead.status}
                    disabled={!!lead.convertedCandidateId}
                    className="h-10 min-w-0 flex-1 rounded-lg border bg-white px-3 text-sm"
                  >
                    {LEAD_STATUSES.map((item) => (
                      <option key={item} value={item}>
                        {LEAD_STATUS_LABELS[item]}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" disabled={statusPending || !!lead.convertedCandidateId} className="bg-[#17201b] text-white">
                    Durumu Kaydet
                  </Button>
                </div>
                {statusState.message ? (
                  <p className={`mt-3 rounded-lg p-3 text-sm ${statusState.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {statusState.message}
                  </p>
                ) : null}
              </form>
              <form action={categoryAction} className="rounded-lg border border-[#dfe4dc] bg-[#f8faf6] p-5">
                <h3 className="font-semibold">Lead Kategorisi</h3>
                <p className="mt-1 text-sm text-[#65705f]">Değerlendirme kategorisi süreç durumundan bağımsızdır.</p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <select
                    aria-label="Lead kategorisi"
                    name="leadCategory"
                    defaultValue={lead.leadCategory}
                    className="h-10 min-w-0 flex-1 rounded-lg border bg-white px-3 text-sm"
                  >
                    {LEAD_CATEGORIES.map((item) => (
                      <option key={item} value={item}>
                        {LEAD_CATEGORY_LABELS[item]}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" disabled={categoryPending} className="bg-[#17201b] text-white">
                    Kategoriyi Kaydet
                  </Button>
                </div>
                {categoryState.message ? (
                  <p className={`mt-3 rounded-lg p-3 text-sm ${categoryState.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {categoryState.message}
                  </p>
                ) : null}
              </form>
            </div>
          ) : null}

          {tab === "Arama Geçmişi" ? (
            <List
              empty="Arama kaydı yok."
              items={lead.activities.filter((activity) => activity.type.includes("Telefon") || activity.type.includes("Arama"))}
              render={(activity) => (
                <TimelineItem key={activity.id} title={activity.type} date={activity.createdAt} description={activity.description} />
              )}
            />
          ) : null}

          {tab === "Randevular" ? (
            <List
              empty="Randevu kaydı yok."
              items={lead.appointments ?? []}
              render={(appointment) => (
                <div key={appointment.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{appointmentStatusLabel(appointment.status)}</Badge>
                    <Badge variant="secondary">{appointmentTypeLabel(appointment.appointmentType)}</Badge>
                  </div>
                  <h3 className="mt-3 font-semibold">{appointment.title}</h3>
                  <p className="mt-1 text-sm text-[#65705f]">
                    {formatDate(appointment.appointmentDate)} · {appointment.assignedUserId}
                  </p>
                  {appointment.outcome ? <p className="mt-2 text-sm">{appointment.outcome}</p> : null}
                </div>
              )}
            />
          ) : null}

          {tab === "Görevler" ? (
            <List
              empty="Görev kaydı yok."
              items={lead.tasks ?? []}
              render={(task) => (
                <div key={task.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{task.status}</Badge>
                    <Badge variant="secondary">{task.priority}</Badge>
                  </div>
                  <h3 className="mt-3 font-semibold">{task.title}</h3>
                  <p className="mt-1 text-sm text-[#65705f]">
                    <CalendarClock className="mr-1 inline size-4" />
                    {formatDate(task.dueDate)} · {task.assignedUserId}
                  </p>
                  {task.description ? <p className="mt-2 text-sm">{task.description}</p> : null}
                </div>
              )}
            />
          ) : null}

          {tab === "Zaman Çizelgesi" ? (
            <List
              empty="Zaman çizelgesi kaydı yok."
              items={lead.activities}
              render={(activity) => <TimelineItem key={activity.id} title={activity.type} date={activity.createdAt} description={activity.description} />}
            />
          ) : null}

          {tab === "Notlar" ? (
            <form action={activityAction} className="grid gap-3">
              <select aria-label="Aktivite türü" name="type" className="h-10 rounded-lg border px-3 text-sm">
                {LEAD_ACTIVITY_TYPES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <textarea aria-label="Aktivite açıklaması" required name="description" rows={4} placeholder="Görüşme veya not detayını yazın" className="rounded-lg border bg-[#f8faf6] p-3 text-sm" />
              {state.message ? (
                <p className={`rounded-lg p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {state.message}
                </p>
              ) : null}
              <Button type="submit" disabled={activityPending} className="justify-self-end bg-[#17201b] text-white">
                <Send className="size-4" />
                {activityPending ? "Kaydediliyor..." : "Notu Kaydet"}
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4">
      <p className="text-xs font-medium uppercase text-[#65705f]">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}

function TimelineItem({ title, date, description }: { title: string; date: string; description: string }) {
  return (
    <div className="relative flex gap-3">
      <div className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#17201b] text-[#a8ff60]">
        {title.includes("Telefon") ? <Phone className="size-4" /> : <Clock3 className="size-4" />}
      </div>
      <div className="min-w-0 flex-1 rounded-lg bg-[#f8faf6] p-3">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-6 text-[#65705f]">{description}</p>
        <time className="mt-2 block text-xs text-[#8a9484]">{formatDate(date)}</time>
      </div>
    </div>
  );
}

function List<T>({ items, render, empty }: { items: T[]; render: (item: T) => React.ReactNode; empty: string }) {
  if (!items.length) return <p className="py-8 text-center text-sm text-[#65705f]">{empty}</p>;

  return <div className="space-y-3">{items.map(render)}</div>;
}
