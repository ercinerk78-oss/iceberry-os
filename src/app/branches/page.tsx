import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Plus, Search } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { branchScopeWhere } from "@/lib/branch-access";
import { branchConceptColor, branchConceptLabel } from "@/lib/branch-concepts";
import { BRANCH_STATUSES, formatDate, label } from "@/lib/franchise";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;

const value = (params: Params, key: string) => (typeof params[key] === "string" ? params[key] : "");

export default async function BranchesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = value(params, "q");
  const city = value(params, "city");
  const concept = value(params, "concept");
  const status = value(params, "status");
  const overdue = value(params, "overdue");
  const critical = value(params, "critical");
  const scope = await branchScopeWhere();
  const where: Prisma.BranchWhereInput = { archivedAt: null, ...scope };
  const andFilters: Prisma.BranchWhereInput[] = [];

  if (q) andFilters.push({ OR: [{ branchName: { contains: q } }, { city: { contains: q } }, { district: { contains: q } }] });
  if (city) where.city = city;
  if (concept) andFilters.push({ OR: [{ conceptId: concept }, { concept }] });
  if (status) where.status = status;
  if (overdue === "yes") where.tasks = { some: { dueDate: { lt: new Date() }, status: { in: ["OPEN", "IN_PROGRESS", "REJECTED"] } } };
  if (critical === "yes") where.audits = { some: { criticalCount: { gt: 0 } } };
  if (andFilters.length) where.AND = andFilters;

  const [items, cities, concepts] = await Promise.all([
    prisma.branch.findMany({
      where,
      select: {
        id: true,
        branchName: true,
        city: true,
        district: true,
        conceptId: true,
        concept: true,
        conceptRelation: true,
        status: true,
        operationsManager: true,
        openingDate: true,
        plannedOpeningDate: true,
        tasks: { select: { id: true, status: true, dueDate: true } },
        audits: { select: { score: true, criticalCount: true, auditDate: true }, orderBy: { auditDate: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.branch.findMany({ where: { archivedAt: null }, select: { city: true }, distinct: ["city"], orderBy: { city: "asc" } }),
    prisma.branchConcept.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <AppShell
      activeHref="/branches"
      eyebrow="Ana işletme varlığı"
      title="Şubeler"
      action={
        <Button asChild className="bg-[#17201b] text-white">
          <Link href="/branches/new">
            <Plus />
            Yeni Şube Ekle
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <Card className="p-4 shadow-none">
          <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
            <label className="relative md:col-span-2">
              <Search className="absolute left-3 top-3 size-4" />
              <input name="q" defaultValue={q} placeholder="Şube veya şehir ara" className="h-10 w-full rounded-lg border pl-9 pr-3" />
            </label>
            <Select name="city" current={city} first="Tüm şehirler" options={cities.map((item) => [item.city, item.city])} />
            <Select name="concept" current={concept} first="Tüm konseptler" options={concepts.map((item) => [item.id, item.name])} />
            <Select name="status" current={status} first="Tüm durumlar" options={Object.entries(BRANCH_STATUSES)} />
            <Select name="overdue" current={overdue} first="Geciken görev" options={[["yes", "Var"]]} />
            <Select name="critical" current={critical} first="Kritik bulgu" options={[["yes", "Var"]]} />
            <div className="flex gap-2 md:col-span-3 xl:col-span-7">
              <Button>Filtrele</Button>
              <Button asChild type="button" variant="outline">
                <Link href="/branches">Temizle</Link>
              </Button>
            </div>
          </form>
        </Card>

        <Card className="overflow-hidden shadow-none">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[#f8faf6] text-xs uppercase text-[#65705f]">
                <tr>
                  {["Şube", "Konsept", "Şehir", "Durum", "Sorumlu", "Açılış", "Denetim", "Açık Görev", "Geciken", "İşlem"].map((header) => (
                    <th key={header} className="px-4 py-3">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((branch) => {
                  const openTasks = branch.tasks.filter((task) => ["OPEN", "IN_PROGRESS", "REJECTED", "SUBMITTED", "UNDER_REVIEW"].includes(task.status)).length;
                  const lateTasks = branch.tasks.filter((task) => task.dueDate && task.dueDate < new Date() && ["OPEN", "IN_PROGRESS", "REJECTED"].includes(task.status)).length;
                  const lastAudit = branch.audits[0];

                  return (
                    <tr key={branch.id}>
                      <td className="px-4 py-4 font-semibold">{branch.branchName}</td>
                      <td className="px-4 py-4">
                        <Badge variant="secondary" style={{ borderColor: branchConceptColor(branch.conceptRelation, branch.concept), color: branchConceptColor(branch.conceptRelation, branch.concept) }}>
                          {branchConceptLabel(branch.conceptRelation, branch.concept)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">{branch.city}</td>
                      <td className="px-4 py-4"><Badge variant="outline">{label(BRANCH_STATUSES, branch.status)}</Badge></td>
                      <td className="px-4 py-4">{branch.operationsManager ?? "-"}</td>
                      <td className="px-4 py-4">{formatDate(branch.openingDate ?? branch.plannedOpeningDate)}</td>
                      <td className="px-4 py-4">{lastAudit?.score ?? "-"}</td>
                      <td className="px-4 py-4">{openTasks}</td>
                      <td className="px-4 py-4">{lateTasks}</td>
                      <td className="px-4 py-4">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/branches/${branch.id}`}>Detay</Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {!items.length ? <tr><td colSpan={10} className="p-12 text-center text-[#65705f]">Filtrelere uygun şube bulunamadı.</td></tr> : null}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-3 lg:hidden">
            {items.map((branch) => {
              const openTasks = branch.tasks.filter((task) => ["OPEN", "IN_PROGRESS", "REJECTED", "SUBMITTED", "UNDER_REVIEW"].includes(task.status)).length;
              const lateTasks = branch.tasks.filter((task) => task.dueDate && task.dueDate < new Date() && ["OPEN", "IN_PROGRESS", "REJECTED"].includes(task.status)).length;

              return (
                <Link key={branch.id} href={`/branches/${branch.id}`} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{branch.branchName}</p>
                      <p className="mt-1 text-sm text-[#65705f]">{branch.city}</p>
                    </div>
                    <Badge variant="outline">{label(BRANCH_STATUSES, branch.status)}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#65705f]">
                    <span>{branchConceptLabel(branch.conceptRelation, branch.concept)}</span>
                    <span>Açık görev: {openTasks}</span>
                    <span>Geciken: {lateTasks}</span>
                  </div>
                </Link>
              );
            })}
            {!items.length ? <p className="p-10 text-center text-sm text-[#65705f]">Filtrelere uygun şube bulunamadı.</p> : null}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Select({ name, current, first, options }: { name: string; current: string; first: string; options: string[][] }) {
  return (
    <select name={name} defaultValue={current} aria-label={first} className="h-10 rounded-lg border px-3">
      <option value="">{first}</option>
      {options.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>{optionLabel}</option>
      ))}
    </select>
  );
}
