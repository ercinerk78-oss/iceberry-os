import Link from "next/link";
import { CalendarClock, CheckCircle2, Filter, RotateCcw, XCircle } from "lucide-react";
import type { Prisma } from "@prisma/client";

import {
  changeLeadAppointmentStatusForm,
  completeLeadAppointmentForm,
  createLeadAppointmentForm,
  rescheduleLeadAppointment,
} from "@/app/appointments/actions";
import { AppShell } from "@/components/app-shell";
import { ManualLeadEntry } from "@/components/appointments/manual-lead-entry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TYPE_LABELS,
  appointmentStatusLabel,
  appointmentTypeLabel,
} from "@/lib/appointments";
import { formatDate } from "@/lib/candidates";
import { LEAD_CATEGORY_LABELS, leadCategoryLabel } from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { containsInsensitive, phoneDigits } from "@/lib/search";

export const dynamic = "force-dynamic";

type Params = {
  date?: string;
  assignedUserId?: string;
  appointmentType?: string;
  status?: string;
  leadCategory?: string;
  city?: string;
  q?: string;
  lead?: string;
};

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const where: Prisma.LeadAppointmentWhereInput = {};
  const q = params.q?.trim();
  const digits = phoneDigits(q);

  if (params.date && params.date !== "today") {
    const start = new Date(`${params.date}T00:00:00`);
    const end = new Date(`${params.date}T23:59:59`);
    where.appointmentDate = { gte: start, lte: end };
  } else if (params.date === "today") {
    where.appointmentDate = { gte: startOfDay, lt: endOfDay };
  }
  if (params.assignedUserId) where.assignedUserId = params.assignedUserId;
  if (params.appointmentType) where.appointmentType = params.appointmentType;
  if (params.status) where.status = params.status;
  if (params.leadCategory) where.lead = { leadCategory: params.leadCategory };
  if (params.city) where.lead = { ...(where.lead as Prisma.LeadWhereInput), city: containsInsensitive(params.city) };
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

  const [appointments, leads, users, cities] = await Promise.all([
    prisma.leadAppointment.findMany({
      where,
      include: { lead: { select: { id: true, fullName: true, city: true, phone: true, leadCategory: true } } },
      orderBy: { appointmentDate: "asc" },
    }).catch((error) => {
      console.error("Appointments table fallback", error);
      return [];
    }),
    prisma.lead.findMany({
      where: { convertedCandidateId: null },
      select: { id: true, fullName: true, city: true, phone: true },
      orderBy: { leadDate: "desc" },
      take: 100,
    }),
    prisma.user.findMany({
      where: { isActive: true, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.lead.findMany({ select: { city: true }, distinct: ["city"], orderBy: { city: "asc" } }),
  ]);

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
      title: "Tamamlanan Randevular",
      icon: CheckCircle2,
      items: appointments.filter((item) => item.status === "COMPLETED"),
    },
    {
      title: "İptal Edilenler",
      icon: XCircle,
      items: appointments.filter((item) => item.status === "CANCELLED"),
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
    <AppShell activeHref="/appointments" eyebrow="Randevu departmanı" title="Randevular" action={<ManualLeadEntry users={users} />}>
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
              <Select name="assignedUserId" current={params.assignedUserId} first="Tüm sorumlular" options={users.map((user) => [user.name, user.name])} />
              <Select name="appointmentType" current={params.appointmentType} first="Tüm tipler" options={Object.entries(APPOINTMENT_TYPE_LABELS)} />
              <Select name="status" current={params.status} first="Tüm durumlar" options={Object.entries(APPOINTMENT_STATUS_LABELS)} />
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

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Yeni Randevu Oluştur</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createLeadAppointmentForm} className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <Select name="leadId" first="Lead seç" options={leads.map((lead) => [lead.id, `${lead.fullName} · ${lead.city}`])} required />
              <input name="appointmentDate" required type="date" className="h-10 rounded-lg border px-3 text-sm" />
              <input name="appointmentTime" required type="time" className="h-10 rounded-lg border px-3 text-sm" />
              <input name="endTime" type="time" className="h-10 rounded-lg border px-3 text-sm" />
              <Select name="appointmentType" options={Object.entries(APPOINTMENT_TYPE_LABELS)} required />
              <Select name="assignedUserId" first="Sorumlu seç" options={users.map((user) => [user.name, user.name])} />
              <input name="title" placeholder="Başlık" className="h-10 rounded-lg border px-3 text-sm" />
              <input name="location" placeholder="Lokasyon" className="h-10 rounded-lg border px-3 text-sm" />
              <input name="meetingLink" placeholder="Online görüşme linki" className="h-10 rounded-lg border px-3 text-sm" />
              <textarea name="notes" placeholder="Randevu notu" className="min-h-20 rounded-lg border p-3 text-sm md:col-span-2 xl:col-span-5" />
              <Button className="h-10 bg-[#17201b] text-white">Randevu Oluştur</Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          {groups.map((group) => (
            <section key={group.title} className="rounded-lg border border-[#dfe4dc] bg-white p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-semibold">
                  <group.icon className="size-4" />
                  {group.title}
                </h2>
                <Badge variant="secondary">{group.items.length}</Badge>
              </div>
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
                        <Link href={`/leads/${appointment.leadId}`} className="mt-3 block font-semibold hover:underline">
                          {appointment.title}
                        </Link>
                        <p className="mt-1 text-sm text-[#65705f]">
                          {appointment.lead.fullName} · {appointment.lead.city} · {formatDate(appointment.appointmentDate.toISOString())}
                        </p>
                        {appointment.location ? <p className="mt-1 text-sm text-[#65705f]">Lokasyon: {appointment.location}</p> : null}
                        {appointment.meetingLink ? (
                          <Link href={appointment.meetingLink} target="_blank" className="mt-1 inline-block text-sm font-medium text-[#17201b] underline">
                            Online görüşme linki
                          </Link>
                        ) : null}
                        {appointment.notes ? <p className="mt-2 text-sm text-[#65705f]">{appointment.notes}</p> : null}
                      </div>
                      <div className="grid gap-2">
                        <form action={changeLeadAppointmentStatusForm.bind(null, appointment.id, "NO_SHOW")} className="flex flex-wrap gap-2">
                          <input name="reason" placeholder="Gelmedi nedeni" className="h-9 min-w-0 rounded-lg border px-3 text-sm" />
                          <Button size="sm" variant="outline">Gelmedi</Button>
                        </form>
                        <form action={changeLeadAppointmentStatusForm.bind(null, appointment.id, "CANCELLED")} className="flex flex-wrap gap-2">
                          <input name="reason" placeholder="İptal nedeni" className="h-9 min-w-0 rounded-lg border px-3 text-sm" />
                          <Button size="sm" variant="outline">İptal Et</Button>
                        </form>
                      </div>
                    </div>
                    <details className="mt-3 rounded-lg bg-white p-3">
                      <summary className="cursor-pointer text-sm font-medium">Sonuç / Erteleme</summary>
                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        <form action={completeLeadAppointmentForm.bind(null, appointment.id)} className="grid gap-2">
                          <textarea name="notes" placeholder="Görüşme notu" className="min-h-20 rounded-lg border p-3 text-sm" />
                          <input name="outcome" placeholder="Görüşme sonucu" required className="h-10 rounded-lg border px-3 text-sm" />
                          <Select name="leadCategory" first="Kategori seç" options={Object.entries(LEAD_CATEGORY_LABELS)} />
                          <input name="nextAction" placeholder="Sonraki aksiyon" className="h-10 rounded-lg border px-3 text-sm" />
                          <input name="nextFollowUpAt" type="datetime-local" className="h-10 rounded-lg border px-3 text-sm" />
                          <label className="flex items-center gap-2 text-sm">
                            <input name="convertToCandidate" value="1" type="checkbox" />
                            Franchise adayına dönüştür
                          </label>
                          <Button size="sm">Tamamla</Button>
                        </form>
                        <form action={rescheduleLeadAppointment.bind(null, appointment.id)} className="grid content-start gap-2">
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
            </section>
          ))}
        </div>
      </div>
    </AppShell>
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
