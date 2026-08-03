import Link from "next/link";
import { CalendarClock, Filter, PhoneCall, RotateCcw, Trash2, XCircle } from "lucide-react";
import type { Prisma } from "@prisma/client";

import {
  changeLeadAppointmentStatusForm,
  deleteLeadAppointmentForm,
  markLeadUnreachableForm,
  rescheduleLeadAppointment,
} from "@/app/appointments/actions";
import { AppShell } from "@/components/app-shell";
import { AppointmentCompleteDialog } from "@/components/appointments/appointment-complete-dialog";
import { AppointmentSchedulerDialog } from "@/components/appointments/appointment-scheduler-dialog";
import { AppointmentSubmitButton } from "@/components/appointments/appointment-submit-button";
import { ManualLeadEntry } from "@/components/appointments/manual-lead-entry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { activeLeadWhere } from "@/lib/active-records";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TYPE_LABELS,
  appointmentDayRange,
  appointmentStatusLabel,
  appointmentTypeLabel,
  formatAppointmentRange,
  todayInAppointmentTimeZone,
} from "@/lib/appointments";
import { LEAD_CATEGORY_LABELS, LEAD_STATUS_LABELS, leadCategoryLabel, leadStatusLabel, statusValuesForFilter } from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { containsInsensitive, phoneDigits } from "@/lib/search";

export const dynamic = "force-dynamic";

type Params = {
  date?: string;
  assignedUserId?: string;
  appointmentType?: string;
  status?: string;
  leadCategory?: string;
  leadStatus?: string;
  city?: string;
  q?: string;
  lead?: string;
};

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const today = todayInAppointmentTimeZone();
  const { start: startOfDay, end: endOfDay } = appointmentDayRange(today);
  const where: Prisma.LeadAppointmentWhereInput = {};
  const leadWhere: Prisma.LeadWhereInput = activeLeadWhere();
  const q = params.q?.trim();
  const digits = phoneDigits(q);

  if (params.date && params.date !== "today") {
    const { start, end } = appointmentDayRange(params.date);
    where.appointmentDate = { gte: start, lt: end };
  } else if (params.date === "today") {
    where.appointmentDate = { gte: startOfDay, lt: endOfDay };
  }
  if (params.assignedUserId) where.assignedUserId = params.assignedUserId;
  if (params.appointmentType) where.appointmentType = params.appointmentType;
  if (params.status) {
    where.status = params.status;
  } else {
    where.status = { not: "CANCELLED" };
  }
  if (params.leadCategory) leadWhere.AND = [...(Array.isArray(leadWhere.AND) ? leadWhere.AND : []), { leadCategory: params.leadCategory }];
  if (params.leadStatus) {
    const values = statusValuesForFilter(params.leadStatus);
    leadWhere.AND = [
      ...(Array.isArray(leadWhere.AND) ? leadWhere.AND : []),
      { OR: [{ processStatus: { in: values } }, { status: { in: values } }] },
    ];
  }
  if (params.city) leadWhere.AND = [...(Array.isArray(leadWhere.AND) ? leadWhere.AND : []), { city: containsInsensitive(params.city) }];
  if (params.lead) where.leadId = params.lead;
  if (q) {
    where.AND = [
      {
        OR: [
          { title: containsInsensitive(q) },
          { notes: containsInsensitive(q) },
          { location: containsInsensitive(q) },
          { lead: { fullName: containsInsensitive(q) } },
          { lead: { city: containsInsensitive(q) } },
          ...(digits ? [{ lead: { phone: containsInsensitive(digits) } }] : []),
        ],
      },
    ];
  }
  where.lead = leadWhere;
  const [appointments, appointmentLeadOptions, visibleLeads, users, cities] = await Promise.all([
    prisma.leadAppointment.findMany({
      where,
      include: { lead: { select: { id: true, fullName: true, city: true, phone: true, leadCategory: true } } },
      orderBy: { appointmentDate: "asc" },
    }).catch((error) => {
      console.error("Appointments table fallback", error);
      return [];
    }),
    prisma.lead.findMany({
      where: activeLeadWhere(),
      select: { id: true, fullName: true, city: true, phone: true },
      orderBy: { leadDate: "desc" },
      take: 200,
    }),
    prisma.lead.findMany({
      where: leadWhere,
      select: { id: true, fullName: true, city: true, phone: true, source: true, processStatus: true, status: true, nextFollowUpAt: true },
      orderBy: [{ nextFollowUpAt: "asc" }, { leadDate: "desc" }],
      take: 200,
    }),
    prisma.user.findMany({
      where: { isActive: true, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.lead.findMany({ where: activeLeadWhere(), select: { city: true }, distinct: ["city"], orderBy: { city: "asc" } }),
  ]);

  const appointmentLeadOptionItems = appointmentLeadOptions.map((lead) => [lead.id, `${lead.fullName} · ${lead.city}`] as [string, string]);
  const userOptionItems = users.map((user) => [user.name, user.name] as [string, string]);
  const appointmentTypeOptionItems = Object.entries(APPOINTMENT_TYPE_LABELS);
  const leadStatusOf = (lead: { processStatus: string | null; status: string }) => lead.processStatus || lead.status;
  const schedulableLeadStatuses = new Set(["NEW", "TO_BE_CALLED"]);
  const appointmentCallUnreachableStatuses = new Set(["APPOINTMENT_CALL_UNREACHABLE", "UNREACHABLE", "Ulaşılamadı"]);
  const appointmentNoShowFollowUpStatuses = new Set(["APPOINTMENT_NO_SHOW_FOLLOW_UP"]);
  const schedulableLeads = visibleLeads.filter((lead) => schedulableLeadStatuses.has(leadStatusOf(lead)));
  const appointmentCallUnreachableLeads = visibleLeads.filter((lead) => appointmentCallUnreachableStatuses.has(leadStatusOf(lead)));
  const appointmentNoShowFollowUpLeads = visibleLeads.filter((lead) => appointmentNoShowFollowUpStatuses.has(leadStatusOf(lead)));

  const groups = [
    {
      title: "Bugünkü Randevular",
      icon: CalendarClock,
      items: appointments.filter((item) => item.appointmentDate >= startOfDay && item.appointmentDate < endOfDay),
    },
    {
      title: "Yaklaşan Randevular",
      icon: CalendarClock,
      items: appointments.filter(
        (item) =>
          item.appointmentDate >= endOfDay &&
          !["COMPLETED", "CANCELLED", "NO_SHOW"].includes(item.status),
      ),
    },
    {
      title: "Geciken Randevular",
      icon: XCircle,
      items: appointments.filter(
        (item) => item.appointmentDate < startOfDay && !["COMPLETED", "CANCELLED", "NO_SHOW"].includes(item.status),
      ),
    },
    {
      title: "Gelmeyenler",
      icon: RotateCcw,
      items: appointments.filter((item) => item.status === "NO_SHOW"),
    },
    {
      title: "Ertelenen Randevular",
      icon: RotateCcw,
      items: appointments.filter((item) => item.status === "RESCHEDULED"),
    },
  ];

  return (
    <AppShell activeHref="/appointments" eyebrow="Randevu departmanı" title="Randevular" action={<ManualLeadEntry />}>
      <div className="space-y-5">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="size-4" />
              Randevu Filtreleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <input name="q" defaultValue={q} placeholder="Ad, telefon, şehir veya not ara" className="h-10 rounded-lg border px-3 text-sm md:col-span-2" />
              <input name="date" defaultValue={params.date === "today" ? "" : params.date} type="date" className="h-10 rounded-lg border px-3 text-sm" />
              <Select name="assignedUserId" current={params.assignedUserId} first="Tüm sorumlular" options={userOptionItems} />
              <Select name="appointmentType" current={params.appointmentType} first="Tüm tipler" options={appointmentTypeOptionItems} />
              <Select name="status" current={params.status} first="Tüm randevu durumları" options={Object.entries(APPOINTMENT_STATUS_LABELS)} />
              <Select name="leadStatus" current={params.leadStatus} first="Tüm lead durumları" options={Object.entries(LEAD_STATUS_LABELS)} />
              <Select name="leadCategory" current={params.leadCategory} first="Tüm kategoriler" options={Object.entries(LEAD_CATEGORY_LABELS)} />
              <Select name="city" current={params.city} first="Tüm şehirler" options={cities.map((item) => [item.city, item.city])} />
              <div className="flex gap-2 md:col-span-3 xl:col-span-6">
                <Button>Filtrele</Button>
                <Button asChild type="button" variant="outline">
                  <Link href="/appointments">Temizle</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="shadow-none">
            <details open>
              <summary className="list-none cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3 text-base">
                    <span>Randevu Adayları</span>
                    <Badge variant="secondary">{schedulableLeads.length}</Badge>
                  </CardTitle>
                </CardHeader>
              </summary>
            <CardContent>
              <div className="space-y-3">
                {schedulableLeads.map((lead) => (
                  <article key={lead.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{leadStatusLabel(lead.processStatus || lead.status)}</Badge>
                          <Badge variant="outline">{lead.source}</Badge>
                        </div>
                        <h3 className="mt-3 font-semibold">{lead.fullName}</h3>
                        <p className="mt-1 text-sm text-[#65705f]">{lead.phone} · {lead.city}</p>
                      </div>
                      <div className="grid shrink-0 gap-2">
                        <AppointmentSchedulerDialog
                          leads={appointmentLeadOptionItems}
                          users={userOptionItems}
                          appointmentTypes={appointmentTypeOptionItems}
                          initialLeadId={lead.id}
                        />
                        <form action={markLeadUnreachableForm.bind(null, lead.id)} className="grid gap-2">
                          <input name="reason" placeholder="Ulaşılamadı notu" className="h-9 min-w-0 rounded-lg border px-3 text-sm" />
                          <AppointmentSubmitButton size="sm" variant="outline" pendingLabel="İşaretleniyor...">
                            Ulaşılamadı
                          </AppointmentSubmitButton>
                        </form>
                      </div>
                    </div>
                  </article>
                ))}
                {!schedulableLeads.length ? (
                  <p className="rounded-lg border border-dashed border-[#dfe4dc] p-8 text-center text-sm text-[#65705f]">Randevu bekleyen aday bulunmuyor.</p>
                ) : null}
              </div>
            </CardContent>
            </details>
          </Card>

          <Card className="shadow-none">
            <details>
              <summary className="list-none cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3 text-base">
                    <span>Randevu İçin Ulaşılamayanlar</span>
                    <Badge variant="secondary">{appointmentCallUnreachableLeads.length}</Badge>
                  </CardTitle>
                </CardHeader>
              </summary>
            <CardContent>
              <div className="space-y-3">
                {appointmentCallUnreachableLeads.map((lead) => (
                  <article key={lead.id} className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{leadStatusLabel(lead.processStatus || lead.status)}</Badge>
                          <Badge variant="outline">{lead.source}</Badge>
                        </div>
                        <h3 className="mt-3 font-semibold">{lead.fullName}</h3>
                        <p className="mt-1 text-sm text-[#65705f]">{lead.phone} · {lead.city}</p>
                        {lead.nextFollowUpAt ? <p className="mt-1 text-xs text-[#8a9484]">Tekrar arama: {formatAppointmentRange(lead.nextFollowUpAt)}</p> : null}
                      </div>
                      <div className="shrink-0">
                        <AppointmentSchedulerDialog
                          leads={appointmentLeadOptionItems}
                          users={userOptionItems}
                          appointmentTypes={appointmentTypeOptionItems}
                          initialLeadId={lead.id}
                        />
                      </div>
                    </div>
                  </article>
                ))}
                {!appointmentCallUnreachableLeads.length ? (
                  <p className="rounded-lg border border-dashed border-[#dfe4dc] p-8 text-center text-sm text-[#65705f]">Randevu için ulaşılamayan lead yok.</p>
                ) : null}
              </div>
            </CardContent>
            </details>
          </Card>

          <Card className="shadow-none">
            <details>
              <summary className="list-none cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3 text-base">
                    <span>Randevuda Ulaşılamayanlar</span>
                    <Badge variant="secondary">{appointmentNoShowFollowUpLeads.length}</Badge>
                  </CardTitle>
                </CardHeader>
              </summary>
            <CardContent>
              <div className="space-y-3">
                {appointmentNoShowFollowUpLeads.map((lead) => (
                  <article key={lead.id} className="rounded-lg border border-rose-200 bg-rose-50/60 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{leadStatusLabel(lead.processStatus || lead.status)}</Badge>
                          <Badge variant="outline">{lead.source}</Badge>
                        </div>
                        <h3 className="mt-3 font-semibold">{lead.fullName}</h3>
                        <p className="mt-1 text-sm text-[#65705f]">{lead.phone} · {lead.city}</p>
                        {lead.nextFollowUpAt ? <p className="mt-1 text-xs text-[#8a9484]">Satış takibi: {formatAppointmentRange(lead.nextFollowUpAt)}</p> : null}
                      </div>
                      <div className="shrink-0">
                        <AppointmentSchedulerDialog
                          leads={appointmentLeadOptionItems}
                          users={userOptionItems}
                          appointmentTypes={appointmentTypeOptionItems}
                          initialLeadId={lead.id}
                          label="Tekrar Randevu Oluştur"
                        />
                      </div>
                    </div>
                  </article>
                ))}
                {!appointmentNoShowFollowUpLeads.length ? (
                  <p className="rounded-lg border border-dashed border-[#dfe4dc] p-8 text-center text-sm text-[#65705f]">Randevu saatinde ulaşılamayan lead yok.</p>
                ) : null}
              </div>
            </CardContent>
            </details>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {groups.map((group) => (
            <section key={group.title} className="rounded-lg border border-[#dfe4dc] bg-white p-4">
              <details open={group.title === "Bugünkü Randevular"}>
                <summary className="mb-4 flex cursor-pointer list-none items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 font-semibold">
                    <group.icon className="size-4" />
                    {group.title}
                  </h2>
                  <Badge variant="secondary">{group.items.length}</Badge>
                </summary>
                <div className="space-y-3">
                {group.items.map((appointment) => (
                  <article key={appointment.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4">
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <Badge>{appointmentStatusLabel(appointment.status)}</Badge>
                          <Badge variant="secondary">{appointmentTypeLabel(appointment.appointmentType)}</Badge>
                          <Badge variant="secondary">{leadCategoryLabel(appointment.lead.leadCategory)}</Badge>
                        </div>
                        <p className="mt-3 font-semibold">
                          {appointment.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#65705f]">
                          <span>{appointment.lead.fullName}</span>
                          <span>·</span>
                          <a href={phoneHref(appointment.lead.phone)} className="inline-flex items-center gap-1 font-medium text-[#17201b] hover:underline">
                            <PhoneCall className="size-3.5" />
                            {appointment.lead.phone}
                          </a>
                          <span>·</span>
                          <span>{appointment.lead.city}</span>
                          <span>·</span>
                          <span>{formatAppointmentRange(appointment.appointmentDate, appointment.endDateTime)}</span>
                        </div>
                        {appointment.location ? <p className="mt-1 text-sm text-[#65705f]">Lokasyon: {appointment.location}</p> : null}
                        {appointment.meetingLink ? (
                          <Link href={appointment.meetingLink} target="_blank" className="mt-1 inline-block text-sm font-medium text-[#17201b] underline">
                            Online görüşme linki
                          </Link>
                        ) : null}
                        {appointment.notes ? <p className="mt-2 text-sm text-[#65705f]">{appointment.notes}</p> : null}
                      </div>
                      <div className="grid gap-2">
                        <Button asChild size="sm" variant="outline">
                          <a href={phoneHref(appointment.lead.phone)}>
                            <PhoneCall className="size-4" />
                            Ara
                          </a>
                        </Button>
                        {appointment.status !== "COMPLETED" ? <AppointmentCompleteDialog appointmentId={appointment.id} /> : null}
                        <form action={changeLeadAppointmentStatusForm.bind(null, appointment.id, "NO_SHOW")} className="flex flex-wrap gap-2">
                          <input name="reason" placeholder="Gelmedi nedeni" className="h-9 min-w-0 rounded-lg border px-3 text-sm" />
                          <Button size="sm" variant="outline">Gelmedi</Button>
                        </form>
                        <form action={changeLeadAppointmentStatusForm.bind(null, appointment.id, "CANCELLED")} className="flex flex-wrap gap-2">
                          <input name="reason" placeholder="İptal nedeni" className="h-9 min-w-0 rounded-lg border px-3 text-sm" />
                          <Button size="sm" variant="outline">İptal Et</Button>
                        </form>
                        <form action={deleteLeadAppointmentForm.bind(null, appointment.id)}>
                          <AppointmentSubmitButton size="sm" variant="destructive" pendingLabel="Siliniyor...">
                            <Trash2 className="size-4" />
                            Sil
                          </AppointmentSubmitButton>
                        </form>
                      </div>
                    </div>
                    <details className="mt-3 rounded-lg bg-white p-3">
                      <summary className="cursor-pointer text-sm font-medium">Erteleme</summary>
                      <div className="mt-3">
                        <form action={rescheduleLeadAppointment.bind(null, appointment.id)} className="grid gap-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
                          <input name="appointmentDate" required type="date" className="h-10 rounded-lg border px-3 text-sm" />
                          <input name="appointmentTime" required type="time" className="h-10 rounded-lg border px-3 text-sm" />
                          <input name="rescheduleReason" placeholder="Erteleme nedeni" className="h-10 rounded-lg border px-3 text-sm" />
                          <Button size="sm" variant="outline">Yeni Tarihe Ertele</Button>
                        </form>
                      </div>
                    </details>
                  </article>
                ))}
                {!group.items.length ? (
                  <p className="py-8 text-center text-sm text-[#65705f]">Bu bölümde randevu yok.</p>
                ) : null}
                </div>
              </details>
            </section>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function phoneHref(phone: string) {
  const normalized = phone.replace(/[^\d+]/g, "");
  return `tel:${normalized || phone}`;
}

function Select({
  name,
  current,
  first,
  options,
  required,
}: {
  name: string;
  current?: string;
  first?: string;
  options: [string, string][];
  required?: boolean;
}) {
  return (
    <select
      aria-label={name}
      name={name}
      defaultValue={current ?? ""}
      required={required}
      className="h-10 rounded-lg border bg-white px-3 text-sm"
    >
      {first ? <option value="">{first}</option> : null}
      {options.map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
