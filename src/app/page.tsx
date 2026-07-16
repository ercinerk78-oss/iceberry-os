import Link from "next/link";
import {
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  LineChart,
  MessageSquareText,
  Store,
  Target,
  TimerReset,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEAD_STATUS_LABELS } from "@/lib/leads";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function safe<T>(operation: Promise<T>, fallback: T) {
  try {
    return await operation;
  } catch (error) {
    console.error("Dashboard metric fallback", error);
    return fallback;
  }
}

export default async function Home() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const [
    activeBranches,
    totalBranches,
    newLeads,
    waitingAppointmentLeads,
    todayAppointments,
    positiveLeads,
    closeFollowUpLeads,
    longTermLeads,
    unproductiveLeads,
    overdueLeadFollowUps,
    overdueLeadTasks,
    totalLeads,
    calledLeads,
    unreachableLeads,
    appointmentCount,
    attendedAppointments,
    staffAppointments,
  ] = await Promise.all([
    prisma.branch.count({ where: { archivedAt: null, status: "ACTIVE" } }),
    prisma.branch.count({ where: { archivedAt: null } }),
    prisma.lead.count({ where: { status: { in: ["NEW", "Yeni"] } } }),
    prisma.lead.count({ where: { status: "WAITING_FOR_APPOINTMENT" } }),
    safe(prisma.leadAppointment.count({ where: { appointmentDate: { gte: startOfDay, lt: endOfDay } } }), 0),
    safe(prisma.lead.count({ where: { leadCategory: "POSITIVE" } }), 0),
    safe(prisma.lead.count({ where: { leadCategory: "CLOSE_FOLLOW_UP" } }), 0),
    safe(prisma.lead.count({ where: { leadCategory: "LONG_TERM" } }), 0),
    safe(prisma.lead.count({ where: { leadCategory: "UNPRODUCTIVE" } }), 0),
    safe(prisma.lead.count({
      where: {
        nextFollowUpAt: { lt: startOfDay },
        status: { notIn: ["CONVERTED_TO_CANDIDATE", "CLOSED", "Adaya Dönüştürüldü", "Reddedildi"] },
      },
    }), 0),
    safe(prisma.leadTask.count({ where: { dueDate: { lt: now }, status: { in: ["Açık", "Devam Ediyor"] } } }), 0),
    prisma.lead.count(),
    prisma.lead.count({ where: { status: { in: ["TO_BE_CALLED", "APPOINTMENT_SCHEDULED", "WAITING_FOR_APPOINTMENT", "MEETING_COMPLETED", "UNDER_EVALUATION", "Arandı", "Randevu"] } } }),
    prisma.lead.count({ where: { status: { in: ["UNREACHABLE", "Ulaşılamadı"] } } }),
    safe(prisma.leadAppointment.count(), 0),
    safe(prisma.leadAppointment.count({ where: { status: "COMPLETED" } }), 0),
    safe(prisma.leadAppointment.groupBy({ by: ["assignedUserId"], _count: { _all: true }, orderBy: { _count: { assignedUserId: "desc" } }, take: 5 }), []),
  ]);
  const number = new Intl.NumberFormat("tr-TR");
  const overdueFollowUps = overdueLeadFollowUps + overdueLeadTasks;
  const conversionRate = totalLeads ? Math.round((appointmentCount / totalLeads) * 100) : 0;
  const attendanceRate = appointmentCount ? Math.round((attendedAppointments / appointmentCount) * 100) : 0;
  const positiveRate = totalLeads ? Math.round((positiveLeads / totalLeads) * 100) : 0;
  const unproductiveRate = totalLeads ? Math.round((unproductiveLeads / totalLeads) * 100) : 0;
  const metrics = [
    { title: "Aktif Şube", value: activeBranches, href: "/branches?status=ACTIVE", change: "Aktif", description: "Faaliyetteki şubeler", icon: Store, tone: "bg-teal-50 text-teal-700 ring-teal-200" },
    { title: "Toplam Şube", value: totalBranches, href: "/branches", change: "Canlı", description: "Arşivlenmemiş şube sayısı", icon: Store, tone: "bg-sky-50 text-sky-700 ring-sky-200" },
    { title: "Yeni Lead", value: newLeads, href: "/leads?status=NEW", change: LEAD_STATUS_LABELS.NEW, description: "Henüz işleme alınmamış leadler", icon: MessageSquareText, tone: "bg-sky-50 text-sky-700 ring-sky-200" },
    { title: "Randevu Bekleyen Lead", value: waitingAppointmentLeads, href: "/leads?status=WAITING_FOR_APPOINTMENT", change: "Randevu", description: "Randevu departmanı takibindeki leadler", icon: CalendarClock, tone: "bg-amber-50 text-amber-700 ring-amber-200" },
    { title: "Bugünkü Randevular", value: todayAppointments, href: "/appointments?date=today", change: "Bugün", description: "Bugün planlanan görüşmeler", icon: CalendarCheck2, tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    { title: "Olumlu Lead", value: positiveLeads, href: "/leads?leadCategory=POSITIVE", change: "% " + positiveRate, description: "Olumlu değerlendirilen leadler", icon: CheckCircle2, tone: "bg-lime-50 text-lime-700 ring-lime-200" },
    { title: "Yakın Takip Lead", value: closeFollowUpLeads, href: "/leads?leadCategory=CLOSE_FOLLOW_UP", change: "Takip", description: "Kısa vadede izlenecek leadler", icon: TimerReset, tone: "bg-violet-50 text-violet-700 ring-violet-200" },
    { title: "Uzun Vade Lead", value: longTermLeads, href: "/leads?leadCategory=LONG_TERM", change: "Uzun vade", description: "Daha ileri tarihe planlanan leadler", icon: Clock3, tone: "bg-cyan-50 text-cyan-700 ring-cyan-200" },
    { title: "Verimsiz Lead", value: unproductiveLeads, href: "/leads?leadCategory=UNPRODUCTIVE", change: "% " + unproductiveRate, description: "Düşük verimli başvurular", icon: XCircle, tone: "bg-rose-50 text-rose-700 ring-rose-200" },
    { title: "Geciken Takipler", value: overdueFollowUps, href: "/tasks?filter=overdue", change: "Gecikme", description: "Takip tarihi geçen lead ve görevler", icon: CalendarClock, tone: "bg-orange-50 text-orange-700 ring-orange-200" },
  ];
  const reporting = [
    ["Gelen lead sayısı", totalLeads],
    ["Aranan lead sayısı", calledLeads],
    ["Ulaşılamayan lead sayısı", unreachableLeads],
    ["Alınan randevu sayısı", appointmentCount],
    ["Randevuya dönüşüm oranı", `%${conversionRate}`],
    ["Görüşmeye katılım oranı", `%${attendanceRate}`],
    ["Olumlu lead oranı", `%${positiveRate}`],
    ["Verimsiz lead oranı", `%${unproductiveRate}`],
  ];

  return (
    <AppShell activeHref="/dashboard" eyebrow="Franchise operasyon merkezi" title="Dashboard">
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {metrics.map((metric) => (
            <Link key={metric.title} href={metric.href} className="block">
              <Card className="h-full rounded-lg border-[#dfe4dc] bg-white shadow-none transition hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader className="gap-3 pb-2">
                  <div className={`flex size-10 items-center justify-center rounded-lg ring-1 ${metric.tone}`}>
                    <metric.icon className="size-5" />
                  </div>
                  <CardTitle className="text-sm font-medium text-[#65705f]">{metric.title}</CardTitle>
                  <CardAction>
                    <Badge variant="secondary" className="bg-[#eef2ea] text-[#364036]">
                      {metric.change}
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold tracking-tight">{number.format(metric.value)}</div>
                  <p className="mt-1 text-sm text-[#65705f]">{metric.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="size-5" />
                Lead ve Randevu Raporları
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {reporting.map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4">
                  <p className="text-sm text-[#65705f]">{label}</p>
                  <p className="mt-2 text-2xl font-semibold">{typeof value === "number" ? number.format(value) : value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="size-5" />
                Personel Bazlı Randevu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {staffAppointments.map((item) => (
                <div key={item.assignedUserId ?? "Atanmadı"} className="flex items-center justify-between rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-3">
                  <span className="text-sm font-medium">{item.assignedUserId ?? "Atanmadı"}</span>
                  <Badge>{number.format(item._count._all)}</Badge>
                </div>
              ))}
              {!staffAppointments.length ? <p className="py-8 text-center text-sm text-[#65705f]">Henüz randevu verisi yok.</p> : null}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
