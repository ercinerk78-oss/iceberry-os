import Link from "next/link";
import { CalendarClock, PhoneCall, RotateCcw, XCircle } from "lucide-react";
import type { Prisma } from "@prisma/client";

import {
  changeLeadAppointmentStatusForm,
  rescheduleLeadAppointment,
} from "@/app/appointments/actions";
import { AppShell } from "@/components/app-shell";
import { AppointmentCompleteDialog } from "@/components/appointments/appointment-complete-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { activeLeadWhere } from "@/lib/active-records";
import {
  appointmentDayRange,
  appointmentStatusLabel,
  appointmentTypeLabel,
  formatAppointmentRange,
  todayInAppointmentTimeZone,
} from "@/lib/appointments";
import { leadCategoryLabel } from "@/lib/leads";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const APPOINTMENT_LIST_LIMIT = 500;

type Params = {
  lead?: string;
};

export default async function AppointmentListPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const today = todayInAppointmentTimeZone();
  const { start: startOfDay, end: endOfDay } = appointmentDayRange(today);
  const where: Prisma.LeadAppointmentWhereInput = { status: { not: "CANCELLED" } };

  if (params.lead) where.leadId = params.lead;
  where.lead = activeLeadWhere();

  const appointments = await prisma.leadAppointment.findMany({
    where,
    include: { lead: { select: { id: true, fullName: true, city: true, phone: true, investmentBudget: true, requestedConcept: true, leadCategory: true } } },
    orderBy: { appointmentDate: "asc" },
    take: APPOINTMENT_LIST_LIMIT,
  }).catch((error) => {
    console.error("Appointments list fallback", error);
    return [];
  });

  const activeAppointments = appointments.filter((item) => item.status === "SCHEDULED");
  const groups = [
    {
      title: "Bugünkü Randevular",
      icon: CalendarClock,
      items: activeAppointments.filter((item) => item.appointmentDate >= startOfDay && item.appointmentDate < endOfDay),
    },
    {
      title: "Yaklaşan Randevular",
      icon: CalendarClock,
      items: activeAppointments.filter((item) => item.appointmentDate >= endOfDay),
    },
    {
      title: "Geciken Randevular",
      icon: XCircle,
      items: activeAppointments.filter((item) => item.appointmentDate < startOfDay),
    },
    {
      title: "Ertelenen Randevular",
      icon: RotateCcw,
      items: appointments.filter((item) => item.status === "RESCHEDULED"),
    },
  ];

  return (
    <AppShell activeHref="/appointments/list" eyebrow="Satış görüşme takibi" title="Randevular">
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
                        <p className="mt-3 font-semibold">{appointment.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#65705f]">
                          <span>{appointment.lead.fullName}</span>
                          <span>-</span>
                          <a href={phoneHref(appointment.lead.phone)} className="inline-flex items-center gap-1 font-medium text-[#17201b] hover:underline">
                            <PhoneCall className="size-3.5" />
                            {appointment.lead.phone}
                          </a>
                          <span>-</span>
                          <span>{appointment.lead.city}</span>
                          <span>-</span>
                          <span>{formatAppointmentRange(appointment.appointmentDate, appointment.endDateTime)}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#65705f]">
                          <span>Yatırım bütçesi: {appointment.lead.investmentBudget || "Belirtilmemiş"}</span>
                          <span>-</span>
                          <span>Konsept tercihi: {appointment.lead.requestedConcept || "Belirtilmemiş"}</span>
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
                          <input name="reason" placeholder="Ulaşılamadı nedeni" className="h-9 min-w-0 rounded-lg border px-3 text-sm" />
                          <Button size="sm" variant="outline">Ulaşılamadı</Button>
                        </form>
                        <form action={changeLeadAppointmentStatusForm.bind(null, appointment.id, "CANCELLED")} className="flex flex-wrap gap-2">
                          <input name="reason" placeholder="İptal nedeni" className="h-9 min-w-0 rounded-lg border px-3 text-sm" />
                          <Button size="sm" variant="outline">İptal Et</Button>
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
    </AppShell>
  );
}

function phoneHref(phone: string) {
  const normalized = phone.replace(/[^\d+]/g, "");
  return `tel:${normalized || phone}`;
}
