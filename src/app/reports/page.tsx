import { CalendarCheck2, LineChart, MessageSquareText, Star, UsersRound } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { formatPercent, percentChange } from "@/lib/branch-revenue";
import { isReportableLead } from "@/lib/lead-reporting";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
  averageScore: number | null;
};

export default async function ReportsPage() {
  await requirePermission("reports");

  const now = new Date();
  const year = now.getFullYear();
  const reportEnd = new Date(year + 1, 0, 1);
  const previousDecemberStart = new Date(year - 1, 11, 1);

  const leads = await safe(
    prisma.lead.findMany({
      where: { leadDate: { gte: previousDecemberStart, lt: reportEnd } },
      select: {
        id: true,
        leadDate: true,
        leadCategory: true,
        convertedCandidateId: true,
        appointments: { select: { status: true } },
      },
      orderBy: { leadDate: "asc" },
    }),
    [],
  );
  const reportableLeads = leads.filter(isReportableLead);
  const convertedCandidateIds = [
    ...new Set(reportableLeads.map((lead) => lead.convertedCandidateId).filter((id): id is string => Boolean(id))),
  ];
  const candidateScores = convertedCandidateIds.length
    ? await safe(
        prisma.franchiseCandidate.findMany({
          where: { id: { in: convertedCandidateIds } },
          select: { id: true, qualificationScore: true },
        }),
        [],
      )
    : [];
  const scoreByCandidate = new Map(candidateScores.map((candidate) => [candidate.id, candidate.qualificationScore]));
  const rows = buildMonthRows(year, now.getMonth(), reportableLeads, scoreByCandidate);
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
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Bu Yıl Toplam Başvuru" value={formatValue(totalLeads)} note="Hatalı form hariç" icon={MessageSquareText} />
        <MetricCard title="Aylık Ortalama Talep" value={averageMonthlyLeadCount.toFixed(1)} note="Ay bazlı ortalama başvuru" icon={LineChart} />
        <MetricCard title="Randevuya Dönüşüm" value={formatPercent(ratio(totalAppointmentLeads, totalLeads))} note="Başvurudan randevuya" icon={CalendarCheck2} />
        <MetricCard title="Görüşme Gerçekleşme" value={formatPercent(ratio(totalCompletedLeads, totalAppointmentLeads))} note="Randevudan görüşmeye" icon={UsersRound} />
        <MetricCard title="Ortalama Görüşme Puanı" value={averageMonthlyScore == null ? "—" : averageMonthlyScore.toFixed(1)} note="Ayların ortalama puanı" icon={Star} />
      </div>

      <Card className="mt-5 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 text-base">
            <span>Aylık Başvuru ve Randevu Dönüşüm Raporu</span>
            {latestRow ? <Badge variant="secondary">Son ay değişimi: {formatPercent(latestRow.monthlyChange)}</Badge> : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs uppercase text-[#65705f]">
                <tr className="border-b border-[#edf0e9]">
                  <th className="px-3 py-3 font-medium">Ay</th>
                  <th className="px-3 py-3 font-medium">Başvuru</th>
                  <th className="px-3 py-3 font-medium">Aylık Değişim</th>
                  <th className="px-3 py-3 font-medium">Randevuya Dönüşüm</th>
                  <th className="px-3 py-3 font-medium">Görüşme Oranı</th>
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

function buildMonthRows(year: number, currentMonthIndex: number, leads: ReportLead[], scoreByCandidate: Map<string, number | null>): MonthReportRow[] {
  const leadCountsByMonth = new Map<string, number>();
  for (const lead of leads) {
    const key = monthKey(lead.leadDate);
    leadCountsByMonth.set(key, (leadCountsByMonth.get(key) ?? 0) + 1);
  }

  return Array.from({ length: currentMonthIndex + 1 }, (_, monthIndex) => {
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
      monthlyChange: percentChange(leadCount, leadCountsByMonth.get(previousKey) ?? 0),
      appointmentLeadCount: appointmentLeads.length,
      completedLeadCount: completedLeads.length,
      appointmentRate: ratio(appointmentLeads.length, leadCount),
      interviewRate: ratio(completedLeads.length, appointmentLeads.length),
      averageScore: average(scoreValues),
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
