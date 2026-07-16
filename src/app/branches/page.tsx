import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Plus, Search } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BRANCH_CONCEPTS, BRANCH_OWNERSHIP_TYPES, BRANCH_STATUSES, formatDate, label } from "@/lib/franchise";
import { branchScopeWhere } from "@/lib/branch-access";
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
  const ownershipType = value(params, "ownershipType");
  const mallName = value(params, "mallName");
  const overdue = value(params, "overdue");
  const critical = value(params, "critical");
  const scope = await branchScopeWhere();
  const where: Prisma.BranchWhereInput = { archivedAt: null, ...scope };

  if (q) {
    where.OR = [
      { branchName: { contains: q } },
      { branchCode: { contains: q } },
      { legalName: { contains: q } },
      { tradeName: { contains: q } },
      { city: { contains: q } },
      { district: { contains: q } },
      { authorizedPersonName: { contains: q } },
    ];
  }
  if (city) where.city = city;
  if (concept) where.concept = concept;
  if (status) where.status = status;
  if (ownershipType) where.ownershipType = ownershipType;
  if (mallName) where.mallName = { contains: mallName };
  if (overdue === "yes") where.tasks = { some: { dueDate: { lt: new Date() }, status: { in: ["OPEN", "IN_PROGRESS", "REJECTED"] } } };
  if (critical === "yes") where.audits = { some: { criticalCount: { gt: 0 } } };

  const [items, cities] = await Promise.all([
    prisma.branch.findMany({
      where,
      include: {
        tasks: { select: { id: true, status: true, dueDate: true } },
        audits: { select: { score: true, criticalCount: true, auditDate: true }, orderBy: { auditDate: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.branch.findMany({ where: { archivedAt: null }, select: { city: true }, distinct: ["city"], orderBy: { city: "asc" } }),
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
          <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-8">
            <label className="relative md:col-span-2">
              <Search className="absolute left-3 top-3 size-4" />
              <input name="q" defaultValue={q} placeholder="Şube, kod, şehir veya yetkili ara" className="h-10 w-full rounded-lg border pl-9 pr-3" />
            </label>
            <Select name="city" current={city} first="Tüm şehirler" options={cities.map((item) => [item.city, item.city])} />
            <Select name="ownershipType" current={ownershipType} first="Tüm işletme tipleri" options={Object.entries(BRANCH_OWNERSHIP_TYPES)} />
            <Select name="concept" current={concept} first="Tüm konseptler" options={Object.entries(BRANCH_CONCEPTS)} />
            <Select name="status" current={status} first="Tüm durumlar" options={Object.entries(BRANCH_STATUSES)} />
            <input name="mallName" defaultValue={mallName} placeholder="AVM" className="h-10 rounded-lg border px-3" />
            <Select name="overdue" current={overdue} first="Geciken görev" options={[["yes", "Var"]]} />
            <Select name="critical" current={critical} first="Kritik bulgu" options={[["yes", "Var"]]} />
            <div className="flex gap-2 md:col-span-3 xl:col-span-8">
              <Button>Filtrele</Button>
              <Button asChild type="button" variant="outline">
                <Link href="/branches">Temizle</Link>
              </Button>
            </div>
          </form>
        </Card>

        <Card className="overflow-hidden shadow-none">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="bg-[#f8faf6] text-xs uppercase text-[#65705f]">
                <tr>
                  {["Şube", "Kod", "Tip", "Konsept", "Şehir", "AVM", "Durum", "Yetkili", "Açılış", "Denetim", "Açık Görev", "Geciken", "İşlem"].map((header) => (
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
                      <td className="px-4 py-4">{branch.branchCode ?? "—"}</td>
                      <td className="px-4 py-4">{label(BRANCH_OWNERSHIP_TYPES, branch.ownershipType)}</td>
                      <td className="px-4 py-4">{label(BRANCH_CONCEPTS, branch.concept)}</td>
                      <td className="px-4 py-4">{branch.city}</td>
                      <td className="px-4 py-4">{branch.mallName ?? "—"}</td>
                      <td className="px-4 py-4"><Badge variant="outline">{label(BRANCH_STATUSES, branch.status)}</Badge></td>
                      <td className="px-4 py-4">{branch.authorizedPersonName ?? branch.managerName ?? "—"}</td>
                      <td className="px-4 py-4">{formatDate(branch.openingDate ?? branch.plannedOpeningDate)}</td>
                      <td className="px-4 py-4">{lastAudit?.score ?? branch.lastAuditScore ?? "—"}</td>
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
                {!items.length ? <tr><td colSpan={13} className="p-12 text-center text-[#65705f]">Filtrelere uygun şube bulunamadı.</td></tr> : null}
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
                      <p className="mt-1 text-sm text-[#65705f]">{branch.branchCode ?? "Kod yok"} · {branch.city}</p>
                    </div>
                    <Badge variant="outline">{label(BRANCH_STATUSES, branch.status)}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#65705f]">
                    <span>{label(BRANCH_OWNERSHIP_TYPES, branch.ownershipType)}</span>
                    <span>{label(BRANCH_CONCEPTS, branch.concept)}</span>
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
