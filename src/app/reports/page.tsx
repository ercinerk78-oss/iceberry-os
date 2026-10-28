import { CalendarCheck2, LineChart, MessageSquareText, Star, Store, UsersRound } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { formatPercent, percentChange } from "@/lib/branch-revenue";
import { interviewToBranchConversion, isReportableLead, resolveReportCandidateIds } from "@/lib/lead-reporting";
import { CLOSED_CANDIDATE_STATUSES } from "@/lib/active-records";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const REPORT_START_MONTH_INDEX = 7;

type ReportLead = {
  id: string;
  leadDate: Date;
  leadCategory: string | null;
  convertedCandidateId: string | null;
  appointments: { status: string }[];
};

type MonthReportRow = {
  key: string;
  label: string;
  leadCount: number;
  monthlyChange: number;
  appointmentLeadCount: number;
  completedLeadCount: number;
  appointmentRate: number | null;
  interviewRate: number | null;
  leadToInterviewRate: number | null;
  averageScore: number | null;
  interviewToBranchRate: number | null;
};

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ audit?: string }> }) {
  await requirePermission("reports");
  const auditRequested = (await searchParams).audit === "conversion";
  let conversionAudit: string | null = null;

  const now = new Date();
  const year = now.getFullYear();
  const reportEnd = new Date(year + 1, 0, 1);
  const reportStart = new Date(year, REPORT_START_MONTH_INDEX, 1);

  const leads = await safe(
    prisma.lead.findMany({
      where: { leadDate: { gte: reportStart, lt: reportEnd } },
      select: {
        id: true,
        phone: true,
        fullName: true,
        leadDate: true,
        leadCategory: true,
        convertedCandidateId: true,
        appointments: { select: { status: true } },
      },
      orderBy: { leadDate: "asc" },
    }),
    [],
  );
  const candidates = await prisma.franchiseCandidate.findMany({
    select: { id: true, fullName: true, phone: true, status: true, qualificationScore: true, branch: { select: { id: true, archivedAt: true } } },
  });
  const resolvedIds = resolveReportCandidateIds(leads, candidates);
  const reportableLeads = leads.filter(isReportableLead).map((lead) => ({ ...lead, convertedCandidateId: resolvedIds.get(lead.id) ?? lead.convertedCandidateId }));
  const convertedCandidateIds = [
    ...new Set(reportableLeads.map((lead) => lead.convertedCandidateId).filter((id): id is string => Boolean(id))),
  ];
  const candidateScores = candidates.filter((candidate) => convertedCandidateIds.includes(candidate.id));
  const scoreByCandidate = new Map(candidateScores.map((candidate) => [candidate.id, candidate.qualificationScore]));
  const branchCandidateIds = new Set(candidateScores.filter((candidate) => (candidate.branch && !candidate.branch.archivedAt) || (CLOSED_CANDIDATE_STATUSES as readonly string[]).includes(candidate.status)).map((candidate) => candidate.id));
  const linkedBranches = await prisma.branch.findMany({
    where: { archivedAt: null, OR: [{ sourceLeadId: { in: reportableLeads.map((lead) => lead.id) } }, { candidateId: { in: convertedCandidateIds } }] },
    select: { sourceLeadId: true, candidateId: true },
  });
  const branchLeadIds = new Set(linkedBranches.flatMap((branch) => branch.sourceLeadId ? [branch.sourceLeadId] : []));
  for (const branch of linkedBranches) if (branch.candidateId) branchCandidateIds.add(branch.candidateId);
  const rows = buildMonthRows(year, REPORT_START_MONTH_INDEX, now.getMonth(), reportableLeads, scoreByCandidate, branchCandidateIds, branchLeadIds);
  const conversion = interviewToBranchConversion(reportableLeads.filter((lead) => lead.leadDate < new Date(year, now.getMonth() + 1, 1)), branchCandidateIds, branchLeadIds);
  if (auditRequested) {
    const fold = (value: string) => value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll("ı", "i");
    const hints = ["abdulkadir", "burak", "nihat", "bunyamin", "serkan"];
    const matches = (name: string) => hints.some((hint) => fold(name).includes(hint));
    const allLeads = await prisma.lead.findMany({ select: { id: true, fullName: true, phone: true, leadDate: true, convertedCandidateId: true, status: true, leadCategory: true, appointments: { select: { status: true } } } });
    const allBranches = await prisma.branch.findMany({ select: { id: true, branchName: true, authorizedPersonName: true, sourceLeadId: true, candidateId: true, status: true, archivedAt: true } });
    const allResolved = resolveReportCandidateIds(allLeads, candidates);
    conversionAudit = JSON.stringify({
      conversion,
      leads: allLeads.filter((lead) => matches(lead.fullName)).map(({ phone, ...lead }) => { void phone; return { ...lead, inPeriod: lead.leadDate >= reportStart && lead.leadDate < reportEnd, resolvedCandidateId: allResolved.get(lead.id), counted: lead.appointments.some((item) => item.status === "COMPLETED") && (branchLeadIds.has(lead.id) || branchCandidateIds.has(allResolved.get(lead.id) ?? "")) }; }),
      candidates: candidates.filter((candidate) => matches(candidate.fullName)).map(({ phone, ...candidate }) => { void phone; return candidate; }),
      branches: allBranches.filter((branch) => matches(branch.authorizedPersonName ?? "") || candidates.some((candidate) => matches(candidate.fullName) && candidate.id === branch.candidateId)),
    }, null, 2);
  }
  const convertedLeads = reportableLeads.filter((lead) => lead.leadDate < new Date(year, now.getMonth() + 1, 1) && lead.appointments.some((item) => item.status === "COMPLETED") && (branchLeadIds.has(lead.id) || (lead.convertedCandidateId && branchCandidateIds.has(lead.convertedCandidateId))));
  const latestRow = rows.at(-1);
  const totalLeads = rows.reduce((sum, row) => sum + row.leadCount, 0);
  const totalAppointmentLeads = rows.reduce((sum, row) => sum + row.appointmentLeadCount, 0);
  const totalCompletedLeads = rows.reduce((sum, row) => sum + row.completedLeadCount, 0);
  const rowsWithLeadData = rows.filter((row) => row.leadCount > 0);
  const monthlyScoreValues = rows.flatMap((row) => (row.averageScore == null ? [] : [row.averageScore]));
  const averageMonthlyScore = average(monthlyScoreValues);
  const averageMonthlyLeadCount = rowsWithLeadData.length ? totalLeads / rowsWithLeadData.length : 0;
  const maxLeadCount = Math.max(...rows.map((row) => row.leadCount), 1);

  return (
    <AppShell activeHref="/reports" eyebrow="Lead ve randevu analitiği" title="Raporlar">
      {conversionAudit ? <section className="mb-5 rounded-lg border bg-white p-4"><h2 className="font-semibold">Dönüşüm Kayıt Kontrolü</h2><pre className="mt-3 max-h-[70vh] overflow-auto whitespace-pre-wrap break-all text-xs">{conversionAudit}</pre></section> : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Bu Yıl Toplam Başvuru" value={formatValue(totalLeads)} note="Hatalı form hariç" icon={MessageSquareText} />
        <MetricCard title="Aylık Ortalama Talep" value={averageMonthlyLeadCount.toFixed(1)} note="Ay bazlı ortalama başvuru" icon={LineChart} />
        <MetricCard title="Randevuya Dönüşüm" value={formatPercent(ratio(totalAppointmentLeads, totalLeads))} note="Başvurudan randevuya" icon={CalendarCheck2} />
        <MetricCard title="Görüşme Gerçekleşme" value={formatPercent(ratio(totalCompletedLeads, totalAppointmentLeads))} note="Randevudan görüşmeye" icon={UsersRound} />
        <MetricCard title="Başvurudan Görüşmeye" value={formatPercent(ratio(totalCompletedLeads, totalLeads))} note="Toplam başvuru içinden" icon={UsersRound} />
        <MetricCard title="Görüşmeden Şubeye Dönüşüm Oranı" value={formatPercent(conversion.rate)} note={`${conversion.convertedCount} şubeye dönüşen / ${conversion.interviewedCount} görüşülen lead`} icon={Store} />
        <MetricCard title="Ortalama Görüşme Puanı" value={averageMonthlyScore == null ? "—" : averageMonthlyScore.toFixed(1)} note="Ayların ortalama puanı" icon={Star} />
      </div>

      <details className="mt-5 rounded-lg border bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold">Şubeye dönüşen görüşmeler ({convertedLeads.length})</summary>
        <ul className="mt-3 grid gap-2 text-sm md:grid-cols-2">{convertedLeads.map((lead) => <li key={lead.id}><Link href={`/leads/${lead.id}`} className="underline">{lead.fullName}</Link></li>)}</ul>
        {!convertedLeads.length ? <p className="mt-3 text-sm text-[#65705f]">Seçili dönemde tamamlanmış görüşmesi ve şube dönüşüm kaydı birlikte bulunan lead yok.</p> : null}
      </details>
      <Card className="mt-5 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 text-base">
            <span>Aylık Başvuru ve Randevu Dönüşüm Raporu</span>
            {latestRow ? <Badge variant="secondary">Son ay değişimi: {formatPercent(latestRow.monthlyChange)}</Badge> : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="text-xs uppercase text-[#65705f]">
                <tr className="border-b border-[#edf0e9]">
                  <th className="px-3 py-3 font-medium">Ay</th>
                  <th className="px-3 py-3 font-medium">Başvuru</th>
                  <th className="px-3 py-3 font-medium">Aylık Değişim</th>
                  <th className="px-3 py-3 font-medium">Randevuya Dönüşüm</th>
                  <th className="px-3 py-3 font-medium">Görüşme Oranı</th>
                  <th className="px-3 py-3 font-medium">Başvurudan Görüşmeye</th>
                  <th className="px-3 py-3 font-medium">Görüşmeden Şubeye Dönüşüm</th>
                  <th className="px-3 py-3 font-medium">Görüşme Ortalama Puanı</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b border-[#edf0e9] last:border-0">
                    <td className="px-3 py-4 font-medium capitalize">{row.label}</td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3">
                        <span className="w-12 font-semibold">{formatValue(row.leadCount)}</span>
                        <span className="h-2 flex-1 rounded-full bg-[#eef5ea]">
                          <span
                            className="block h-2 rounded-full bg-[#6fbe44]"
                            style={{ width: `${Math.max((row.leadCount / maxLeadCount) * 100, row.leadCount ? 8 : 0)}%` }}
                          />
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <ChangeBadge value={row.monthlyChange} />
                    </td>
                    <td className="px-3 py-4">
                      <RateWithCount rate={row.appointmentRate} count={row.appointmentLeadCount} suffix="randevu" />
                    </td>
                    <td className="px-3 py-4">
                      <RateWithCount rate={row.interviewRate} count={row.completedLeadCount} suffix="görüşme" />
                    </td>
                    <td className="px-3 py-4">
                      <RateWithCount rate={row.leadToInterviewRate} count={row.completedLeadCount} suffix="görüşme" />
                    </td>
                    <td className="px-3 py-4 font-semibold">{formatPercent(row.interviewToBranchRate)}</td>
                    <td className="px-3 py-4">{row.averageScore == null ? "—" : `${row.averageScore.toFixed(1)} / 10`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length ? <p className="py-10 text-center text-sm text-[#65705f]">Bu yıl için raporlanabilir lead kaydı bulunmuyor.</p> : null}
        </CardContent>
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

function buildMonthRows(year: number, startMonthIndex: number, currentMonthIndex: number, leads: ReportLead[], scoreByCandidate: Map<string, number | null>, branchCandidateIds: ReadonlySet<string>, branchLeadIds: ReadonlySet<string>): MonthReportRow[] {
  const leadCountsByMonth = new Map<string, number>();
  for (const lead of leads) {
    const key = monthKey(lead.leadDate);
    leadCountsByMonth.set(key, (leadCountsByMonth.get(key) ?? 0) + 1);
  }

  const visibleStartMonthIndex = Math.min(startMonthIndex, currentMonthIndex);

  return Array.from({ length: currentMonthIndex - visibleStartMonthIndex + 1 }, (_, index) => {
    const monthIndex = visibleStartMonthIndex + index;
    const date = new Date(year, monthIndex, 1);
    const key = monthKey(date);
    const previousKey = monthKey(new Date(year, monthIndex - 1, 1));
    const monthLeads = leads.filter((lead) => monthKey(lead.leadDate) === key);
    const leadCount = monthLeads.length;
    const appointmentLeads = monthLeads.filter(hasCountableAppointment);
    const completedLeads = monthLeads.filter(hasCompletedAppointment);
    const scoreValues = completedLeads
      .map((lead) => (lead.convertedCandidateId ? scoreByCandidate.get(lead.convertedCandidateId) : null))
      .filter((score): score is number => typeof score === "number");

    return {
      key,
      label: date.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
      leadCount,
      monthlyChange: index === 0 ? 0 : percentChange(leadCount, leadCountsByMonth.get(previousKey) ?? 0),
      appointmentLeadCount: appointmentLeads.length,
      completedLeadCount: completedLeads.length,
      appointmentRate: ratio(appointmentLeads.length, leadCount),
      interviewRate: ratio(completedLeads.length, appointmentLeads.length),
      leadToInterviewRate: ratio(completedLeads.length, leadCount),
      averageScore: average(scoreValues),
      interviewToBranchRate: interviewToBranchConversion(monthLeads, branchCandidateIds, branchLeadIds).rate,
    };
  });
}

function hasCountableAppointment(lead: ReportLead) {
  return lead.appointments.some((appointment) => appointment.status !== "CANCELLED");
}

function hasCompletedAppointment(lead: ReportLead) {
  return lead.appointments.some((appointment) => appointment.status === "COMPLETED");
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function ratio(value: number, total: number) {
  if (!total) return null;

  return (value / total) * 100;
}

function average(values: number[]) {
  if (!values.length) return null;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatValue(value: number) {
  return value.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

function MetricCard({ title, value, note, icon: Icon }: { title: string; value: string; note: string; icon: typeof MessageSquareText }) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-sm">
          <span>{title}</span>
          <Icon className="size-4 text-[#2f5f20]" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="mt-1 text-xs text-[#65705f]">{note}</p>
      </CardContent>
    </Card>
  );
}

function ChangeBadge({ value }: { value: number }) {
  const tone = value > 0 ? "bg-emerald-50 text-emerald-800" : value < 0 ? "bg-rose-50 text-rose-800" : "bg-[#f8faf6] text-[#65705f]";
  const sign = value > 0 ? "+" : "";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {sign}{formatPercent(value)}
    </span>
  );
}

function RateWithCount({ rate, count, suffix }: { rate: number | null; count: number; suffix: string }) {
  return (
    <div>
      <p className="font-semibold">{formatPercent(rate)}</p>
      <p className="text-xs text-[#65705f]">{formatValue(count)} {suffix}</p>
    </div>
  );
}
