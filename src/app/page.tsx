import Link from "next/link";
import {
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  LineChart,
  MapPinned,
  MessageSquareText,
  Store,
  Target,
  TimerReset,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTranslations } from "@/lib/i18n/server";
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

function leadProcessWhere(values: string[], legacyValues: string[] = values) {
  return {
    OR: [
      { processStatus: { in: values } },
      { status: { in: legacyValues } },
    ],
  };
}

export default async function Home() {
  const { t } = await getTranslations();
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
    invalidFormLeads,
    overdueLeadFollowUps,
    overdueLeadTasks,
    totalLeads,
    calledLeads,
    unreachableLeads,
    appointmentCount,
    attendedAppointments,
    staffAppointments,
    newLocationOpportunities,
    readyLocationReports,
    waitingInvestorLocations,
    negotiatingLocations,
    score1To3,
    score4To6,
    score7To8,
    score9To10,
    unscoredCandidates,
    conceptDistribution,
  ] = await Promise.all([
    prisma.branch.count({ where: { archivedAt: null, status: "ACTIVE" } }),
    prisma.branch.count({ where: { archivedAt: null } }),
    safe(prisma.lead.count({ where: leadProcessWhere(["NEW"], ["NEW", "Yeni"]) }), 0),
    safe(prisma.lead.count({ where: leadProcessWhere(["WAITING_FOR_APPOINTMENT"]) }), 0),
    safe(prisma.leadAppointment.count({ where: { appointmentDate: { gte: startOfDay, lt: endOfDay } } }), 0),
    safe(prisma.lead.count({ where: { leadCategory: "POSITIVE" } }), 0),
    safe(prisma.lead.count({ where: { leadCategory: "CLOSE_FOLLOW_UP" } }), 0),
    safe(prisma.lead.count({ where: { leadCategory: "LONG_TERM" } }), 0),
    safe(prisma.lead.count({ where: { leadCategory: "UNPRODUCTIVE" } }), 0),
    safe(prisma.lead.count({ where: { leadCategory: "INVALID_FORM" } }), 0),
    safe(prisma.lead.count({
      where: {
        nextFollowUpAt: { lt: startOfDay },
        processStatus: { notIn: ["CONVERTED_TO_CANDIDATE", "CLOSED"] },
        status: { notIn: ["CONVERTED_TO_CANDIDATE", "CLOSED", "Adaya Dönüştürüldü", "Reddedildi"] },
      },
    }), 0),
    safe(prisma.leadTask.count({ where: { dueDate: { lt: now }, status: { in: ["Açık", "Devam Ediyor"] } } }), 0),
    prisma.lead.count(),
    safe(prisma.lead.count({
      where: leadProcessWhere(
        ["TO_BE_CALLED", "APPOINTMENT_SCHEDULED", "WAITING_FOR_APPOINTMENT", "MEETING_COMPLETED", "UNDER_EVALUATION"],
        ["TO_BE_CALLED", "APPOINTMENT_SCHEDULED", "WAITING_FOR_APPOINTMENT", "MEETING_COMPLETED", "UNDER_EVALUATION", "Arandı", "Randevu"],
      ),
    }), 0),
    safe(prisma.lead.count({ where: leadProcessWhere(["UNREACHABLE"], ["UNREACHABLE", "Ulaşılamadı"]) }), 0),
    safe(prisma.leadAppointment.count(), 0),
    safe(prisma.leadAppointment.count({ where: { status: "COMPLETED" } }), 0),
    safe(prisma.leadAppointment.groupBy({ by: ["assignedUserId"], _count: { _all: true }, orderBy: { _count: { assignedUserId: "desc" } }, take: 5 }), []),
    safe(prisma.candidateLocation.count({ where: { archivedAt: null, status: "NEW_OPPORTUNITY" } }), 0),
    safe(prisma.candidateLocation.count({ where: { archivedAt: null, documents: { some: { archivedAt: null, documentType: { in: ["LOCATION_ANALYSIS_PDF", "LOCATION_ANALYSIS_JPEG"] } } } } }), 0),
    safe(prisma.candidateLocation.count({ where: { archivedAt: null, status: "WAITING_FOR_INVESTOR" } }), 0),
    safe(prisma.candidateLocation.count({ where: { archivedAt: null, status: "IN_NEGOTIATION" } }), 0),
    safe(prisma.franchiseCandidate.count({ where: { archivedAt: null, qualificationScore: { gte: 1, lte: 3 } } }), 0),
    safe(prisma.franchiseCandidate.count({ where: { archivedAt: null, qualificationScore: { gte: 4, lte: 6 } } }), 0),
    safe(prisma.franchiseCandidate.count({ where: { archivedAt: null, qualificationScore: { gte: 7, lte: 8 } } }), 0),
    safe(prisma.franchiseCandidate.count({ where: { archivedAt: null, qualificationScore: { gte: 9, lte: 10 } } }), 0),
    safe(prisma.franchiseCandidate.count({ where: { archivedAt: null, qualificationScore: null } }), 0),
    safe(prisma.concept.findMany({
      select: { id: true, name: true, _count: { select: { candidateConcepts: true } } },
      orderBy: { candidateConcepts: { _count: "desc" } },
      take: 6,
    }), []),
  ]);
  const number = new Intl.NumberFormat("tr-TR");
  const overdueFollowUps = overdueLeadFollowUps + overdueLeadTasks;
  const validLeads = Math.max(totalLeads - invalidFormLeads, 0);
  const conversionRate = validLeads ? Math.round((appointmentCount / validLeads) * 100) : 0;
  const attendanceRate = appointmentCount ? Math.round((attendedAppointments / appointmentCount) * 100) : 0;
  const positiveRate = validLeads ? Math.round((positiveLeads / validLeads) * 100) : 0;
  const unproductiveRate = validLeads ? Math.round((unproductiveLeads / validLeads) * 100) : 0;
  const metrics = [
    { title: t("dashboard.activeBranches"), value: activeBranches, href: "/branches?status=ACTIVE", change: t("dashboard.active"), description: t("dashboard.activeBranchesDesc"), icon: Store, tone: "bg-teal-50 text-teal-700 ring-teal-200" },
    { title: t("dashboard.totalBranches"), value: totalBranches, href: "/branches", change: t("dashboard.live"), description: t("dashboard.totalBranchesDesc"), icon: Store, tone: "bg-sky-50 text-sky-700 ring-sky-200" },
    { title: t("dashboard.newLeads"), value: newLeads, href: "/leads?status=NEW", change: t("leadStatus.NEW"), description: t("dashboard.newLeadsDesc"), icon: MessageSquareText, tone: "bg-sky-50 text-sky-700 ring-sky-200" },
    { title: t("dashboard.waitingAppointmentLeads"), value: waitingAppointmentLeads, href: "/leads?status=WAITING_FOR_APPOINTMENT", change: t("dashboard.appointment"), description: t("dashboard.waitingAppointmentDesc"), icon: CalendarClock, tone: "bg-amber-50 text-amber-700 ring-amber-200" },
    { title: t("dashboard.todayAppointments"), value: todayAppointments, href: "/appointments?date=today", change: t("dashboard.today"), description: t("dashboard.todayAppointmentsDesc"), icon: CalendarCheck2, tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    { title: t("dashboard.positiveLeads"), value: positiveLeads, href: "/leads?leadCategory=POSITIVE", change: `% ${positiveRate}`, description: t("dashboard.positiveLeadsDesc"), icon: CheckCircle2, tone: "bg-lime-50 text-lime-700 ring-lime-200" },
    { title: t("dashboard.closeFollowUpLeads"), value: closeFollowUpLeads, href: "/leads?leadCategory=CLOSE_FOLLOW_UP", change: t("dashboard.followUp"), description: t("dashboard.closeFollowUpDesc"), icon: TimerReset, tone: "bg-violet-50 text-violet-700 ring-violet-200" },
    { title: t("dashboard.longTermLeads"), value: longTermLeads, href: "/leads?leadCategory=LONG_TERM", change: t("dashboard.longTerm"), description: t("dashboard.longTermDesc"), icon: Clock3, tone: "bg-cyan-50 text-cyan-700 ring-cyan-200" },
    { title: t("dashboard.unproductiveLeads"), value: unproductiveLeads, href: "/leads?leadCategory=UNPRODUCTIVE", change: `% ${unproductiveRate}`, description: t("dashboard.unproductiveDesc"), icon: XCircle, tone: "bg-rose-50 text-rose-700 ring-rose-200" },
    { title: "Hatalı Form", value: invalidFormLeads, href: "/leads?leadCategory=INVALID_FORM", change: "Hariç", description: "Rapor oranlarından hariç tutulan geçersiz başvurular.", icon: XCircle, tone: "bg-zinc-50 text-zinc-700 ring-zinc-200" },
    { title: t("dashboard.overdueFollowUps"), value: overdueFollowUps, href: "/tasks?filter=overdue", change: t("dashboard.delay"), description: t("dashboard.overdueDesc"), icon: CalendarClock, tone: "bg-orange-50 text-orange-700 ring-orange-200" },
  ];
  const reporting = [
    [t("dashboard.incomingLeadCount"), totalLeads],
    ["Geçerli Lead Sayısı", validLeads],
    ["Hatalı Form / Geçersiz", invalidFormLeads],
    [t("dashboard.calledLeadCount"), calledLeads],
    [t("dashboard.unreachableLeadCount"), unreachableLeads],
    [t("dashboard.appointmentCount"), appointmentCount],
    [t("dashboard.appointmentConversionRate"), `%${conversionRate}`],
    [t("dashboard.attendanceRate"), `%${attendanceRate}`],
    [t("dashboard.positiveLeadRate"), `%${positiveRate}`],
    [t("dashboard.unproductiveLeadRate"), `%${unproductiveRate}`],
  ];
  const locationOpportunities = [
    ["Yeni Fırsatlar", newLocationOpportunities, "/locations?status=NEW_OPPORTUNITY"],
    ["Raporu Hazır", readyLocationReports, "/locations?report=ready"],
    ["Yatırımcı Bekleyen", waitingInvestorLocations, "/locations?status=WAITING_FOR_INVESTOR"],
    ["Görüşme Aşamasında", negotiatingLocations, "/locations?status=IN_NEGOTIATION"],
  ] as const;
  const scoreDistribution = [
    ["1-3", score1To3],
    ["4-6", score4To6],
    ["7-8", score7To8],
    ["9-10", score9To10],
    ["Puansız", unscoredCandidates],
  ] as const;

  return (
    <AppShell activeHref="/dashboard" eyebrow={t("dashboard.eyebrow")} title={t("dashboard.title")}>
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
                {t("dashboard.leadAppointmentReports")}
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
                {t("dashboard.staffAppointments")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {staffAppointments.map((item) => (
                <div key={item.assignedUserId ?? t("dashboard.unassigned")} className="flex items-center justify-between rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-3">
                  <span className="text-sm font-medium">{item.assignedUserId ?? t("dashboard.unassigned")}</span>
                  <Badge>{number.format(item._count._all)}</Badge>
                </div>
              ))}
              {!staffAppointments.length ? <p className="py-8 text-center text-sm text-[#65705f]">{t("dashboard.noAppointmentData")}</p> : null}
            </CardContent>
          </Card>
        </section>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPinned className="size-5" />
              Lokasyon Fırsatları
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            {locationOpportunities.map(([label, value, href]) => (
              <Link key={label} href={href} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4 hover:border-[#17201b]">
                <p className="text-sm text-[#65705f]">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{number.format(value)}</p>
              </Link>
            ))}
          </CardContent>
        </Card>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Qualification Score Dağılımı</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-5">
              {scoreDistribution.map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4">
                  <p className="text-sm text-[#65705f]">{label}</p>
                  <p className="mt-2 text-2xl font-semibold">{number.format(value)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Konsept Bazlı Aday Dağılımı</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {conceptDistribution.map((concept) => (
                <div key={concept.id} className="flex items-center justify-between rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-3">
                  <span className="text-sm font-medium">{concept.name}</span>
                  <Badge>{number.format(concept._count.candidateConcepts)}</Badge>
                </div>
              ))}
              {!conceptDistribution.length ? <p className="py-8 text-center text-sm text-[#65705f]">Konsept dağılımı için henüz veri yok.</p> : null}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
