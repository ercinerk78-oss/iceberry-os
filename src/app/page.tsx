import Link from "next/link";
import {
  CalendarCheck2,
  CalendarClock,
  LineChart,
  MapPinned,
  MessageSquareText,
  Store,
  Target,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { activeCandidateWhere, activeLeadWhere } from "@/lib/active-records";
import { visibleMainBranchConceptWhere, withNonHotelMainBranchWhere } from "@/lib/branch-visibility";
import { getTranslations } from "@/lib/i18n/server";
import {
  isActiveReportLead,
  isClosedLead,
  isCountableAppointment,
  isConvertedLead,
  isInvalidLead,
  isLeadStatus,
  isReportableLead,
} from "@/lib/lead-reporting";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const APPOINTMENT_CALL_UNREACHABLE_STATUSES = ["APPOINTMENT_CALL_UNREACHABLE", "UNREACHABLE"] as const;
const APPOINTMENT_NO_SHOW_FOLLOW_UP_STATUSES = ["APPOINTMENT_NO_SHOW_FOLLOW_UP"] as const;

async function safe<T>(operation: Promise<T>, fallback: T) {
  try {
    return await operation;
  } catch (error) {
    console.error("Dashboard metric fallback", error);
    return fallback;
  }
}

export default async function Home() {
  const { t } = await getTranslations();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const [
    activeBranches,
    totalBranches,
    leadRows,
    appointmentRows,
    todayAppointments,
    overdueLeadFollowUps,
    overdueLeadTasks,
    staffAppointments,
    activeCandidateCount,
    passiveCandidateCount,
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
    branchConceptDistribution,
    branchConceptStatusCounts,
  ] = await Promise.all([
    prisma.branch.count({ where: withNonHotelMainBranchWhere({ archivedAt: null, status: "ACTIVE" }) }),
    prisma.branch.count({ where: withNonHotelMainBranchWhere({ archivedAt: null }) }),
    safe(
      prisma.lead.findMany({
        select: {
          id: true,
          status: true,
          processStatus: true,
          leadCategory: true,
          convertedCandidateId: true,
        },
      }),
      [],
    ),
    safe(
      prisma.leadAppointment.findMany({
        select: {
          id: true,
          leadId: true,
          status: true,
          appointmentDate: true,
          lead: { select: { leadCategory: true } },
        },
      }),
      [],
    ),
    safe(prisma.leadAppointment.count({ where: { lead: activeLeadWhere({ OR: [{ leadCategory: null }, { leadCategory: { not: "INVALID_FORM" } }] }), status: { not: "CANCELLED" }, appointmentDate: { gte: startOfDay, lt: endOfDay } } }), 0),
    safe(prisma.lead.count({
      where: activeLeadWhere({ nextFollowUpAt: { lt: startOfDay }, OR: [{ leadCategory: null }, { leadCategory: { not: "INVALID_FORM" } }] }),
    }), 0),
    safe(prisma.leadTask.count({ where: { lead: activeLeadWhere({ OR: [{ leadCategory: null }, { leadCategory: { not: "INVALID_FORM" } }] }), dueDate: { lt: now }, status: { in: ["Açık", "Devam Ediyor"] } } }), 0),
    safe(prisma.leadAppointment.groupBy({ by: ["assignedUserId"], where: { lead: activeLeadWhere({ OR: [{ leadCategory: null }, { leadCategory: { not: "INVALID_FORM" } }] }) }, _count: { _all: true }, orderBy: { _count: { assignedUserId: "desc" } }, take: 5 }), []),
    safe(prisma.franchiseCandidate.count({ where: activeCandidateWhere() }), 0),
    safe(prisma.franchiseCandidate.count({ where: { archivedAt: { not: null } } }), 0),
    safe(prisma.candidateLocation.count({ where: { archivedAt: null, status: "NEW_OPPORTUNITY" } }), 0),
    safe(prisma.candidateLocation.count({ where: { archivedAt: null, documents: { some: { archivedAt: null, documentType: { in: ["LOCATION_ANALYSIS_PDF", "LOCATION_ANALYSIS_JPEG"] } } } } }), 0),
    safe(prisma.candidateLocation.count({ where: { archivedAt: null, status: "WAITING_FOR_INVESTOR" } }), 0),
    safe(prisma.candidateLocation.count({ where: { archivedAt: null, status: "IN_NEGOTIATION" } }), 0),
    safe(prisma.franchiseCandidate.count({ where: activeCandidateWhere({ qualificationScore: { gte: 1, lte: 3 } }) }), 0),
    safe(prisma.franchiseCandidate.count({ where: activeCandidateWhere({ qualificationScore: { gte: 4, lte: 6 } }) }), 0),
    safe(prisma.franchiseCandidate.count({ where: activeCandidateWhere({ qualificationScore: { gte: 7, lte: 8 } }) }), 0),
    safe(prisma.franchiseCandidate.count({ where: activeCandidateWhere({ qualificationScore: { gte: 9, lte: 10 } }) }), 0),
    safe(prisma.franchiseCandidate.count({ where: activeCandidateWhere({ qualificationScore: null }) }), 0),
    safe(prisma.concept.findMany({
      where: { isActive: true },
      select: { id: true, name: true, _count: { select: { candidateConcepts: { where: { candidate: activeCandidateWhere() } } } } },
      orderBy: { candidateConcepts: { _count: "desc" } },
      take: 6,
    }), []),
    safe(prisma.branchConcept.findMany({
      where: visibleMainBranchConceptWhere,
      select: { id: true, name: true, color: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }), []),
    safe(prisma.branch.groupBy({
      by: ["conceptId", "status"],
      where: withNonHotelMainBranchWhere({ archivedAt: null, conceptId: { not: null } }),
      _count: { _all: true },
    }), []),
  ]);
  const number = new Intl.NumberFormat("tr-TR");
  const overdueFollowUps = overdueLeadFollowUps + overdueLeadTasks;
  const totalLeads = leadRows.length;
  const reportableLeads = leadRows.filter(isReportableLead);
  const activeLeadCountForReport = leadRows.filter(isActiveReportLead).length;
  const newLeads = reportableLeads.filter((lead) => isLeadStatus(lead, "NEW") && !isConvertedLead(lead) && !isClosedLead(lead)).length;
  const waitingAppointmentLeads = reportableLeads.filter((lead) => isLeadStatus(lead, "WAITING_FOR_APPOINTMENT") && !isConvertedLead(lead) && !isClosedLead(lead)).length;
  const convertedLeadCount = reportableLeads.filter(isConvertedLead).length;
  const closedLeadCount = reportableLeads.filter(isClosedLead).length;
  const invalidFormLeads = leadRows.filter(isInvalidLead).length;
  const countableAppointments = appointmentRows.filter(isCountableAppointment);
  const appointmentCount = countableAppointments.length;
  const appointmentLeadIds = new Set(countableAppointments.map((appointment) => appointment.leadId));
  const completedAppointments = countableAppointments.filter((appointment) => appointment.status === "COMPLETED");
  const scheduledAppointments = countableAppointments.filter((appointment) => appointment.status === "SCHEDULED");
  const completedLeadIds = new Set(completedAppointments.map((appointment) => appointment.leadId));
  const appointmentCallUnreachableLeadIds = new Set(
    reportableLeads
      .filter((lead) => APPOINTMENT_CALL_UNREACHABLE_STATUSES.some((status) => isLeadStatus(lead, status)))
      .map((lead) => lead.id),
  );
  const appointmentNoShowFollowUpLeadIds = new Set([
    ...countableAppointments.filter((appointment) => appointment.status === "NO_SHOW").map((appointment) => appointment.leadId),
    ...reportableLeads
      .filter((lead) => APPOINTMENT_NO_SHOW_FOLLOW_UP_STATUSES.some((status) => isLeadStatus(lead, status)))
      .map((lead) => lead.id),
  ]);
  const unreachableLeadIds = new Set([...appointmentCallUnreachableLeadIds, ...appointmentNoShowFollowUpLeadIds]);
  const closedWithoutConversionCount = reportableLeads.filter((lead) => isClosedLead(lead) && !isConvertedLead(lead)).length;
  const validLeads = Math.max(totalLeads - invalidFormLeads, 0);
  const conversionRate = validLeads ? Math.round((appointmentLeadIds.size / validLeads) * 100) : 0;
  const attendanceRate = appointmentLeadIds.size ? Math.round((completedLeadIds.size / appointmentLeadIds.size) * 100) : 0;
  const unreachableRate = validLeads ? Math.round((unreachableLeadIds.size / validLeads) * 100) : 0;
  const metrics = [
    { title: t("dashboard.activeBranches"), value: activeBranches, href: "/branches?status=ACTIVE", change: t("dashboard.active"), description: t("dashboard.activeBranchesDesc"), icon: Store, tone: "bg-teal-50 text-teal-700 ring-teal-200" },
    { title: t("dashboard.totalBranches"), value: totalBranches, href: "/branches", change: t("dashboard.live"), description: t("dashboard.totalBranchesDesc"), icon: Store, tone: "bg-sky-50 text-sky-700 ring-sky-200" },
    { title: t("dashboard.newLeads"), value: newLeads, href: "/leads?status=NEW", change: t("leadStatus.NEW"), description: t("dashboard.newLeadsDesc"), icon: MessageSquareText, tone: "bg-sky-50 text-sky-700 ring-sky-200" },
    { title: t("dashboard.waitingAppointmentLeads"), value: waitingAppointmentLeads, href: "/appointments", change: t("dashboard.appointment"), description: t("dashboard.waitingAppointmentDesc"), icon: CalendarClock, tone: "bg-amber-50 text-amber-700 ring-amber-200" },
    { title: t("dashboard.todayAppointments"), value: todayAppointments, href: "/appointments?date=today", change: t("dashboard.today"), description: t("dashboard.todayAppointmentsDesc"), icon: CalendarCheck2, tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    { title: "Aktif Franchise Adayı", value: activeCandidateCount, href: "/candidates", change: "Aktif", description: "Franchise adayları ana listesindeki aktif adaylar.", icon: Target, tone: "bg-lime-50 text-lime-700 ring-lime-200" },
    { title: "Pasif Franchise Adayı", value: passiveCandidateCount, href: "/candidates?view=passive", change: "Pasif", description: "Pasife alınan franchise adayları.", icon: XCircle, tone: "bg-stone-50 text-stone-700 ring-stone-200" },
    { title: "Adaya Dönüşen Lead", value: convertedLeadCount, href: "/candidates", change: "Dönüşüm", description: "Franchise adayına çevrilen lead kayıtları.", icon: Target, tone: "bg-cyan-50 text-cyan-700 ring-cyan-200" },
    { title: "Randevuda Ulaşılamayan", value: appointmentNoShowFollowUpLeadIds.size, href: "/appointments", change: "Takip", description: "Randevu saatinde ulaşılamayan tekil leadler.", icon: XCircle, tone: "bg-rose-50 text-rose-700 ring-rose-200" },
    { title: "Hatalı Form", value: invalidFormLeads, href: "/reports#lead-raporu", change: "Hariç", description: "Rapor oranlarından hariç tutulan geçersiz başvurular.", icon: XCircle, tone: "bg-zinc-50 text-zinc-700 ring-zinc-200" },
    { title: t("dashboard.overdueFollowUps"), value: overdueFollowUps, href: "/tasks?filter=overdue", change: t("dashboard.delay"), description: t("dashboard.overdueDesc"), icon: CalendarClock, tone: "bg-orange-50 text-orange-700 ring-orange-200" },
  ];
  const reporting = [
    ["Toplam Lead", totalLeads],
    ["Aktif Lead", activeLeadCountForReport],
    ["Adaya Dönüşen", convertedLeadCount],
    ["Aktif Franchise Adayı", activeCandidateCount],
    ["Pasif Franchise Adayı", passiveCandidateCount],
    ["Pasife Alınan", closedLeadCount],
    ["Hatalı Form / Geçersiz", invalidFormLeads],
    ["Randevu İçin Ulaşılamayan", appointmentCallUnreachableLeadIds.size],
    ["Randevuda Ulaşılamayan", appointmentNoShowFollowUpLeadIds.size],
    ["Görüşülemeyen Lead", unreachableLeadIds.size],
    ["Dönüşsüz Kapanan", closedWithoutConversionCount],
    ["Randevu Kaydı", appointmentCount],
    ["Randevu Alınan Lead", appointmentLeadIds.size],
    ["Görüşülen Lead", completedLeadIds.size],
    ["Planlı Randevu", scheduledAppointments.length],
    [t("dashboard.appointmentConversionRate"), `%${conversionRate}`],
    [t("dashboard.attendanceRate"), `%${attendanceRate}`],
    ["Ulaşılamama Oranı", `%${unreachableRate}`],
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
  const branchConceptCountMap = new Map<string, { total: number; active: number; opening: number }>();
  for (const row of branchConceptStatusCounts) {
    if (!row.conceptId) continue;
    const current = branchConceptCountMap.get(row.conceptId) ?? { total: 0, active: 0, opening: 0 };
    const count = row._count._all;
    current.total += count;
    if (row.status === "ACTIVE") current.active += count;
    if (["PLANNED", "IN_SETUP", "READY_TO_OPEN", "CONTRACTED"].includes(row.status)) current.opening += count;
    branchConceptCountMap.set(row.conceptId, current);
  }

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

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Konsept Bazlı Şube Dağılımı</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {branchConceptDistribution.map((concept) => {
              const counts = branchConceptCountMap.get(concept.id) ?? { total: 0, active: 0, opening: 0 };

              return (
                <Link key={concept.id} href={`/branches?concept=${concept.id}`} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4 hover:border-[#17201b]">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full" style={{ backgroundColor: concept.color }} />
                    <p className="font-semibold">{concept.name}</p>
                  </div>
                  <p className="mt-3 text-2xl font-semibold">{number.format(counts.total)}</p>
                  <p className="mt-1 text-sm text-[#65705f]">Aktif: {number.format(counts.active)} · Açılış: {number.format(counts.opening)}</p>
                </Link>
              );
            })}
            {!branchConceptDistribution.length ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-[#65705f] xl:col-span-4">Şube konsepti dağılımı için henüz veri yok.</p> : null}
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

