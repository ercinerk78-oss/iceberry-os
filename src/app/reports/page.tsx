import Link from "next/link";
import { BarChart3, CalendarCheck2, FileText, LineChart, PhoneOff, Star, Store, Target, UsersRound } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { activeLeadWhere } from "@/lib/active-records";
import { appointmentStatusLabel } from "@/lib/appointments";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requirePermission("reports");

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [
    activeLeadCount,
    totalLeadCount,
    appointmentRows,
    branchCount,
    openingCount,
    revenueRows,
    documentCount,
    branchConcepts,
  ] = await Promise.all([
    safe(prisma.lead.count({ where: activeLeadWhere() }), 0),
    safe(prisma.lead.count(), 0),
    safe(
      prisma.leadAppointment.findMany({
        select: {
          id: true,
          leadId: true,
          status: true,
          appointmentDate: true,
          lead: {
            select: {
              id: true,
              fullName: true,
              city: true,
              convertedCandidateId: true,
              processStatus: true,
              status: true,
            },
          },
        },
        orderBy: { appointmentDate: "desc" },
      }),
      [],
    ),
    safe(prisma.branch.count({ where: { archivedAt: null } }), 0),
    safe(prisma.openingProject.count({ where: { archivedAt: null } }), 0),
    safe(
      prisma.branchRevenueRecord.findMany({
        where: { periodStart: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
        select: { netRevenue: true },
      }),
      [],
    ),
    safe(prisma.document.count({ where: { archivedAt: null } }), 0),
    safe(
      prisma.branchConcept.findMany({
        select: {
          id: true,
          name: true,
          color: true,
          branches: { where: { archivedAt: null }, select: { status: true } },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      [],
    ),
  ]);

  const appointmentLeadIds = new Set(appointmentRows.map((appointment) => appointment.leadId));
  const completedAppointments = appointmentRows.filter((appointment) => appointment.status === "COMPLETED");
  const noShowAppointments = appointmentRows.filter((appointment) => appointment.status === "NO_SHOW");
  const cancelledAppointments = appointmentRows.filter((appointment) => appointment.status === "CANCELLED");
  const rescheduledAppointments = appointmentRows.filter((appointment) => appointment.status === "RESCHEDULED");
  const scheduledAppointments = appointmentRows.filter((appointment) => appointment.status === "SCHEDULED");
  const completedLeadIds = new Set(completedAppointments.map((appointment) => appointment.leadId));
  const noShowLeadIds = new Set(noShowAppointments.map((appointment) => appointment.leadId));
  const unreachableLeadIds = new Set(
    appointmentRows
      .filter((appointment) =>
        ["APPOINTMENT_CALL_UNREACHABLE", "UNREACHABLE", "Ulaşılamadı", "APPOINTMENT_NO_SHOW_FOLLOW_UP"].includes(
          appointment.lead.processStatus || appointment.lead.status,
        ),
      )
      .map((appointment) => appointment.leadId),
  );
  const convertedCandidateIds = Array.from(
    new Set(completedAppointments.map((appointment) => appointment.lead.convertedCandidateId).filter(Boolean)),
  ) as string[];
  const scoredCandidates = await safe(
    convertedCandidateIds.length
      ? prisma.franchiseCandidate.findMany({
          where: { id: { in: convertedCandidateIds }, archivedAt: null },
          select: { id: true, fullName: true, city: true, qualificationScore: true },
          orderBy: [{ qualificationScore: "desc" }, { createdAt: "desc" }],
        })
      : Promise.resolve([]),
    [],
  );
  const scoreValues = scoredCandidates.map((candidate) => candidate.qualificationScore).filter((score): score is number => typeof score === "number");
  const averageScore = scoreValues.length ? scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length : 0;
  const highScoreCandidates = scoredCandidates.filter((candidate) => (candidate.qualificationScore ?? 0) >= 8);
  const lowScoreCandidates = scoredCandidates.filter((candidate) => (candidate.qualificationScore ?? 0) > 0 && (candidate.qualificationScore ?? 0) <= 4);
  const unscoredCompletedCandidates = scoredCandidates.filter((candidate) => !candidate.qualificationScore);
  const latestCompleted = completedAppointments.slice(0, 6);
  const revenueTotal = revenueRows.reduce((sum, row) => sum + (row.netRevenue ?? 0), 0);
  const cards = [
    { title: "Lead Raporu", value: activeLeadCount, href: "/candidates", icon: Target, note: "Franchise adayları içinde lead ve randevu dönüşümü" },
    { title: "Randevu Raporu", value: appointmentRows.length, href: "#randevu-raporu", icon: CalendarCheck2, note: "Planlanan, görüşülen ve ulaşılamayan lead özeti" },
    { title: "Şube Raporu", value: branchCount, href: "/branches", icon: Store, note: "Aktif ve toplam şube görünümü" },
    { title: "Açılış Raporu", value: openingCount, href: "/openings", icon: BarChart3, note: "Kurulum projeleri ve aşamalar" },
    { title: "Ciro Raporu", value: revenueTotal, href: "/branch-revenues", icon: LineChart, note: "Bu ay kayıtlı net ciro" },
    { title: "Doküman Raporu", value: documentCount, href: "/documents", icon: FileText, note: "Aktif doküman kayıtları" },
  ];

  return (
    <AppShell activeHref="/reports" eyebrow="Yönetim raporları" title="Raporlar">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.title} href={card.href} className="block">
            <Card className="h-full shadow-none transition hover:border-[#6fbe44]">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3 text-base">
                  <span className="flex items-center gap-2">
                    <card.icon className="size-5 text-[#2f5f20]" />
                    {card.title}
                  </span>
                  <Badge variant="secondary">{formatValue(card.value)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-[#65705f]">{card.note}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-5 p-4 text-sm text-[#65705f] shadow-none">
        Rapor sekmesi canlı modüllere bağlandı.
        <span className="ml-2">Gün başlangıcı: {startOfDay.toLocaleDateString("tr-TR")}</span>
      </Card>

      <Card id="randevu-raporu" className="mt-5 scroll-mt-24 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarCheck2 className="size-5 text-[#2f5f20]" />
            Randevu Raporu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ReportMetric title="Toplam Lead" value={totalLeadCount} note="Sisteme gelen tüm lead kayıtları" icon={Target} />
            <ReportMetric title="Randevu Alınan Lead" value={appointmentLeadIds.size} note="En az bir randevu kaydı olan lead" icon={CalendarCheck2} />
            <ReportMetric title="Görüşülen Lead" value={completedLeadIds.size} note="Tamamlandı durumundaki görüşmeler" icon={UsersRound} />
            <ReportMetric title="Görüşülemeyen Lead" value={noShowLeadIds.size + unreachableLeadIds.size} note="Gelmedi veya ulaşılamadı takibindeki lead" icon={PhoneOff} />
            <ReportMetric title="Planlı Randevu" value={scheduledAppointments.length} note="Henüz tamamlanmamış randevular" icon={CalendarCheck2} />
            <ReportMetric title="Gelmedi" value={noShowAppointments.length} note="Randevu saatinde ulaşılamayanlar" icon={PhoneOff} />
            <ReportMetric title="İptal" value={cancelledAppointments.length} note="İptal edilen randevular" icon={PhoneOff} />
            <ReportMetric title="Ertelenen" value={rescheduledAppointments.length} note="Yeni zamana alınan randevular" icon={CalendarCheck2} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4">
              <h3 className="font-semibold">Görüşülen Yatırımcı Puan Özeti</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <ScoreBox label="Ortalama Puan" value={scoreValues.length ? averageScore.toFixed(1) : "—"} note={`${scoreValues.length} puanlı aday`} />
                <ScoreBox label="Yüksek Puan" value={highScoreCandidates.length} note="8-10 arası" />
                <ScoreBox label="Düşük Puan" value={lowScoreCandidates.length} note="1-4 arası" />
                <ScoreBox label="Puansız" value={unscoredCompletedCandidates.length} note="Puan bekliyor" />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <CandidateScoreList title="En Yüksek Puanlılar" candidates={highScoreCandidates.slice(0, 5)} />
                <CandidateScoreList title="Düşük Puanlılar" candidates={lowScoreCandidates.slice(0, 5)} />
              </div>
            </div>

            <div className="rounded-lg border border-[#edf0e9] bg-white p-4">
              <h3 className="font-semibold">Son Görüşülenler</h3>
              <div className="mt-3 space-y-3">
                {latestCompleted.map((appointment) => (
                  <div key={appointment.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{appointment.lead.fullName}</p>
                        <p className="text-xs text-[#65705f]">{appointment.lead.city} · {dateTR(appointment.appointmentDate)}</p>
                      </div>
                      <Badge>{appointmentStatusLabel(appointment.status)}</Badge>
                    </div>
                  </div>
                ))}
                {!latestCompleted.length ? <p className="py-6 text-center text-sm text-[#65705f]">Henüz tamamlanan görüşme yok.</p> : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-5 p-4 shadow-none">
        <h2 className="font-semibold">Konsept Bazlı Şube Özeti</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {branchConcepts.map((concept) => {
            const active = concept.branches.filter((branch) => branch.status === "ACTIVE").length;
            const opening = concept.branches.filter((branch) => ["PLANNED", "IN_SETUP", "READY_TO_OPEN", "CONTRACTED"].includes(branch.status)).length;

            return (
              <Link key={concept.id} href={`/branches?concept=${concept.id}`} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4 hover:border-[#17201b]">
                <span className="inline-flex items-center gap-2 font-medium">
                  <span className="size-3 rounded-full" style={{ backgroundColor: concept.color }} />
                  {concept.name}
                </span>
                <p className="mt-3 text-2xl font-semibold">{formatValue(concept.branches.length)}</p>
                <p className="text-sm text-[#65705f]">Aktif: {formatValue(active)} · Açılış: {formatValue(opening)}</p>
              </Link>
            );
          })}
        </div>
      </Card>
    </AppShell>
  );
}

async function safe<T>(promise: Promise<T>, fallback: T) {
  try {
    return await promise;
  } catch (error) {
    console.error("[reports] metric fallback", error);
    return fallback;
  }
}

function ReportMetric({
  title,
  value,
  note,
  icon: Icon,
}: {
  title: string;
  value: number;
  note: string;
  icon: typeof Target;
}) {
  return (
    <div className="rounded-lg border border-[#edf0e9] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[#65705f]">{title}</p>
        <Icon className="size-4 text-[#2f5f20]" />
      </div>
      <p className="mt-3 text-2xl font-semibold">{formatValue(value)}</p>
      <p className="mt-1 text-xs text-[#65705f]">{note}</p>
    </div>
  );
}

function ScoreBox({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className="rounded-lg border border-[#dfe4dc] bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[#65705f]">{label}</span>
        <Star className="size-3.5 text-[#6fbe44]" />
      </div>
      <p className="mt-2 text-xl font-semibold">{typeof value === "number" ? formatValue(value) : value}</p>
      <p className="text-xs text-[#65705f]">{note}</p>
    </div>
  );
}

function CandidateScoreList({
  title,
  candidates,
}: {
  title: string;
  candidates: { id: string; fullName: string; city: string; qualificationScore: number | null }[];
}) {
  return (
    <div className="rounded-lg border border-[#dfe4dc] bg-white p-3">
      <h4 className="text-sm font-semibold">{title}</h4>
      <div className="mt-3 space-y-2">
        {candidates.map((candidate) => (
          <Link key={candidate.id} href={`/candidates/${candidate.id}`} className="flex items-center justify-between gap-3 rounded-lg bg-[#f8faf6] px-3 py-2 hover:bg-[#eef5ea]">
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{candidate.fullName}</span>
              <span className="block text-xs text-[#65705f]">{candidate.city}</span>
            </span>
            <Badge>{candidate.qualificationScore ?? "—"}/10</Badge>
          </Link>
        ))}
        {!candidates.length ? <p className="py-4 text-center text-xs text-[#65705f]">Bu grupta aday yok.</p> : null}
      </div>
    </div>
  );
}

function formatValue(value: number) {
  return value.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

function dateTR(value: Date) {
  return value.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}
