import type { Prisma } from "@prisma/client";

import {
  BranchVisitCalendar,
  type BranchVisitCalendarItem,
} from "@/components/branches/branch-visit-calendar";
import { AppShell } from "@/components/app-shell";
import { branchScopeWhere } from "@/lib/branch-access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;

const value = (params: Params, key: string) => (typeof params[key] === "string" ? params[key] : "");

export default async function BranchVisitCalendarPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const now = new Date();
  const selectedMonth = parseMonth(value(params, "month"), now);
  const monthStart = new Date(selectedMonth.year, selectedMonth.month - 1, 1);
  const monthEnd = new Date(selectedMonth.year, selectedMonth.month, 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const branchId = value(params, "branch");
  const visitorName = value(params, "responsible");
  const status = value(params, "status");
  const scope = await branchScopeWhere();
  const branchWhere: Prisma.BranchWhereInput = { archivedAt: null, ...scope };
  const visitWhere: Prisma.BranchVisitWhereInput = {
    plannedAt: { gte: monthStart, lt: monthEnd },
    branch: branchWhere,
  };

  if (branchId) visitWhere.branchId = branchId;
  if (visitorName) visitWhere.visitorName = visitorName;
  if (status && status !== "MISSED") visitWhere.status = status;

  const [branches, users, visits] = await Promise.all([
    prisma.branch.findMany({
      where: branchWhere,
      select: { id: true, branchName: true, city: true },
      orderBy: [{ city: "asc" }, { branchName: "asc" }],
      take: 750,
    }),
    prisma.user.findMany({
      where: { isActive: true, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 250,
    }),
    prisma.branchVisit.findMany({
      where: visitWhere,
      select: {
        id: true,
        branchId: true,
        title: true,
        visitType: true,
        plannedAt: true,
        completedAt: true,
        status: true,
        visitorName: true,
        notes: true,
        resultNotes: true,
        branch: { select: { branchName: true, city: true } },
      },
      orderBy: [{ plannedAt: "asc" }, { createdAt: "asc" }],
      take: 750,
    }),
  ]);

  const calendarVisits = visits
    .map((visit) => toCalendarVisit(visit, todayStart))
    .filter((visit) => !status || visit.derivedStatus === status);
  const visitsByDay = groupVisitsByDay(calendarVisits);
  const weeks = buildCalendarWeeks(monthStart, monthEnd, now, visitsByDay);
  const total = calendarVisits.length;
  const completed = calendarVisits.filter((visit) => visit.derivedStatus === "COMPLETED").length;
  const planned = calendarVisits.filter((visit) => visit.derivedStatus === "PLANNED").length;
  const failed = calendarVisits.filter((visit) => visit.derivedStatus === "CANCELLED" || visit.derivedStatus === "MISSED").length;
  const monthLabel = monthStart.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

  return (
    <AppShell activeHref="/branch-visits" eyebrow="Merkez operasyon takvimi" title="Şube Ziyaretleri">
      <BranchVisitCalendar
        monthLabel={capitalize(monthLabel)}
        prevHref={monthHref(params, addMonths(monthStart, -1))}
        nextHref={monthHref(params, addMonths(monthStart, 1))}
        weeks={weeks}
        summary={[
          { label: "Gerçekleşen Ziyaretler", count: completed, percent: percent(completed, total), tone: "border-emerald-200 bg-emerald-50 text-emerald-800" },
          { label: "Planlanan Ziyaretler", count: planned, percent: percent(planned, total), tone: "border-amber-200 bg-amber-50 text-amber-900" },
          { label: "İptal Edilen / Gerçekleşmeyen", count: failed, percent: percent(failed, total), tone: "border-rose-200 bg-rose-50 text-rose-800" },
        ]}
        branches={branches}
        users={users}
        filters={{ branchId, visitorName, status }}
      />
    </AppShell>
  );
}

function parseMonth(month: string, fallback: Date) {
  if (/^\d{4}-\d{2}$/.test(month)) {
    const [year, monthNumber] = month.split("-").map(Number);
    if (monthNumber >= 1 && monthNumber <= 12) return { year, month: monthNumber };
  }

  return { year: fallback.getFullYear(), month: fallback.getMonth() + 1 };
}

function toCalendarVisit(
  visit: {
    id: string;
    branchId: string;
    title: string;
    visitType: string;
    plannedAt: Date;
    completedAt: Date | null;
    status: string;
    visitorName: string | null;
    notes: string | null;
    resultNotes: string | null;
    branch: { branchName: string; city: string };
  },
  todayStart: Date,
): BranchVisitCalendarItem {
  const derivedStatus =
    visit.status === "PLANNED" && visit.plannedAt < todayStart
      ? "MISSED"
      : visit.status === "COMPLETED"
        ? "COMPLETED"
        : visit.status === "CANCELLED"
          ? "CANCELLED"
          : "PLANNED";

  return {
    id: visit.id,
    branchId: visit.branchId,
    branchName: visit.branch.branchName,
    city: visit.branch.city,
    title: visit.title,
    visitType: visit.visitType,
    plannedAt: visit.plannedAt.toISOString(),
    plannedAtInput: dateTimeInput(visit.plannedAt),
    completedAt: visit.completedAt?.toISOString() ?? "",
    completedAtInput: visit.completedAt ? dateTimeInput(visit.completedAt) : "",
    status: visit.status,
    derivedStatus,
    visitorName: visit.visitorName ?? "",
    notes: visit.notes ?? "",
    resultNotes: visit.resultNotes ?? "",
  };
}

function groupVisitsByDay(visits: BranchVisitCalendarItem[]) {
  const map = new Map<string, BranchVisitCalendarItem[]>();
  for (const visit of visits) {
    const date = new Date(visit.plannedAt);
    const key = dayKey(date);
    map.set(key, [...(map.get(key) ?? []), visit]);
  }

  return map;
}

function buildCalendarWeeks(monthStart: Date, monthEnd: Date, now: Date, visitsByDay: Map<string, BranchVisitCalendarItem[]>) {
  const start = new Date(monthStart);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(monthEnd);
  end.setDate(end.getDate() + (7 - ((end.getDay() + 6) % 7 || 7)));

  const days = [];
  for (const cursor = new Date(start); cursor < end; cursor.setDate(cursor.getDate() + 1)) {
    const date = new Date(cursor);
    const key = dayKey(date);
    days.push({
      key,
      dayNumber: date.getDate(),
      inMonth: date >= monthStart && date < monthEnd,
      isToday: key === dayKey(now),
      visits: visitsByDay.get(key) ?? [],
    });
  }

  const weeks = [];
  for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7));

  return weeks;
}

function monthHref(params: Params, date: Date) {
  const next = new URLSearchParams();
  next.set("month", `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  for (const key of ["branch", "responsible", "status"]) {
    const current = value(params, key);
    if (current) next.set(key, current);
  }

  return `/branch-visits?${next.toString()}`;
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateTimeInput(date: Date) {
  return `${dayKey(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function percent(count: number, total: number) {
  return total ? Math.round((count / total) * 100) : 0;
}

function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase("tr-TR") + value.slice(1);
}
