import Link from "next/link";
import type React from "react";
import type { Prisma } from "@prisma/client";
import { AlertTriangle, CalendarDays, CheckCircle2, Plus, Search, ShieldAlert } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { dateTR, openingProjectStatusLabels, openingRiskLevelLabels } from "@/lib/openings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;
const get = (params: Params, key: string) => (typeof params[key] === "string" ? params[key] as string : "");

const emptyOpeningsData = {
  items: [],
  statusCounts: [],
  riskCounts: [],
  cities: [],
  legacyCount: 0,
  setupError: null as string | null,
};

export default async function Openings({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = get(params, "q");
  const status = get(params, "status");
  const risk = get(params, "risk");
  const city = get(params, "city");
  const alert = get(params, "alert");
  const now = new Date();
  const soon = new Date(now.getTime() + 14 * 86400000);

  const where: Prisma.OpeningProjectWhereInput = { archivedAt: null };
  if (q) {
    where.OR = [
      { projectNumber: { contains: q } },
      { name: { contains: q } },
      { branch: { branchName: { contains: q } } },
      { city: { contains: q } },
      { investorName: { contains: q } },
    ];
  }
  if (status) where.status = status as Prisma.EnumOpeningProjectStatusFilter["equals"];
  if (risk) where.riskLevel = risk as Prisma.EnumOpeningRiskLevelFilter["equals"];
  if (city) where.city = city;
  if (alert === "late") where.AND = [{ targetOpeningDate: { lt: now } }, { status: { notIn: ["COMPLETED", "CANCELLED", "OPENED", "POST_OPENING"] } }];
  if (alert === "soon") where.targetOpeningDate = { gte: now, lte: soon };

  const { items, statusCounts, riskCounts, cities, legacyCount, setupError } = await loadOpeningsData(where);

  const activeCount = statusCounts.filter((item) => !["COMPLETED", "CANCELLED"].includes(item.status)).reduce((sum, item) => sum + item._count._all, 0);
  const readyCount = statusCounts.find((item) => item.status === "READY_FOR_OPENING")?._count._all ?? 0;
  const delayedCount = items.filter((item) => item.targetOpeningDate < now && !["COMPLETED", "CANCELLED", "OPENED", "POST_OPENING"].includes(item.status)).length;
  const criticalRiskCount = riskCounts.find((item) => item.riskLevel === "CRITICAL")?._count._all ?? 0;

  return (
    <AppShell activeHref="/openings" eyebrow="Şube kurulum projeleri" title="Açılış Yönetimi" action={<Button asChild><Link href="/openings/new"><Plus className="size-4" />Yeni Açılış Projesi</Link></Button>}>
      <div className="space-y-5">
        {setupError ? (
          <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-none">
            Açılış Yönetimi veri tabanı hazırlığı tamamlanmamış görünüyor. Production migration koruması eklendi; deploy sonrası ekran otomatik çalışır hale gelecektir.
          </Card>
        ) : null}

        <section className="grid gap-3 md:grid-cols-4">
          <Kpi title="Aktif Açılış Projesi" value={activeCount} icon={<CalendarDays className="size-5" />} />
          <Kpi title="Açılışa Hazır" value={readyCount} icon={<CheckCircle2 className="size-5" />} />
          <Kpi title="Geciken Proje" value={delayedCount} icon={<AlertTriangle className="size-5" />} danger />
          <Kpi title="Kritik Risk" value={criticalRiskCount} icon={<ShieldAlert className="size-5" />} danger />
        </section>

        {legacyCount ? (
          <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-none">
            Sistemde {legacyCount} eski tip BranchOpening kaydı var. Bu kayıtlar korunuyor; yeni projeler gelişmiş OpeningProject motoruyla oluşturulur.
          </Card>
        ) : null}

        <Card className="p-4 shadow-none">
          <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
            <label className="relative xl:col-span-2">
              <Search className="absolute left-3 top-3 size-4" />
              <input name="q" defaultValue={q} placeholder="Proje, şube, şehir veya yatırımcı ara" className="h-10 w-full rounded-lg border pl-9 pr-3 text-sm" />
            </label>
            <Select name="status" value={status} first="Tüm durumlar" options={Object.entries(openingProjectStatusLabels)} />
            <Select name="risk" value={risk} first="Tüm riskler" options={Object.entries(openingRiskLevelLabels)} />
            <Select name="city" value={city} first="Tüm şehirler" options={cities.map((item) => [item.city, item.city])} />
            <Select name="alert" value={alert} first="Tüm zaman durumları" options={[["late", "Geciken projeler"], ["soon", "Yaklaşan açılışlar"]]} />
            <Button>Filtrele</Button>
          </form>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          {items.map((project) => {
            const currentStage = project.stages.find((stage) => ["READY_TO_START", "IN_PROGRESS", "DELAYED", "AT_RISK"].includes(stage.status)) ?? project.stages[0];
            const lateMilestones = project.milestones.filter((milestone) => milestone.dueDate && milestone.dueDate < now && !["COMPLETED", "CANCELLED", "SKIPPED"].includes(milestone.status)).length;
            const isLate = project.targetOpeningDate < now && !["COMPLETED", "CANCELLED", "OPENED", "POST_OPENING"].includes(project.status);
            return (
              <Card key={project.id} className={`p-5 shadow-none ${isLate ? "border-rose-300" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/openings/${project.id}`} className="text-lg font-semibold hover:underline">{project.name}</Link>
                    <p className="mt-1 text-sm text-[#65705f]">{project.projectNumber} · {project.branch.branchName} · {project.city}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{openingProjectStatusLabels[project.status]}</Badge>
                    <Badge className={project.riskLevel === "CRITICAL" || project.riskLevel === "HIGH" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}>{openingRiskLevelLabels[project.riskLevel]}</Badge>
                  </div>
                </div>
                <div className="mt-4 h-2 rounded bg-[#edf0e9]"><div className="h-2 rounded bg-[#6fbe44]" style={{ width: `${project.progressPercentage}%` }} /></div>
                <div className="mt-2 flex justify-between text-sm"><span>{currentStage?.nameSnapshot ?? "Aşama yok"}</span><strong>%{project.progressPercentage}</strong></div>
                <div className="mt-4 grid grid-cols-4 gap-2 text-sm">
                  <span>Açılış<br /><strong>{dateTR(project.targetOpeningDate)}</strong></span>
                  <span>Hazırlık<br /><strong>%{project.openingReadinessScore}</strong></span>
                  <span>Geciken<br /><strong className={lateMilestones ? "text-rose-700" : ""}>{lateMilestones}</strong></span>
                  <span>Görev<br /><strong>{project._count.tasks}</strong></span>
                </div>
                {isLate ? <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-rose-700"><AlertTriangle className="size-4" />Hedef açılış tarihi geçmiş.</p> : null}
              </Card>
            );
          })}
          {!items.length ? <p className="col-span-full rounded-lg border border-dashed p-12 text-center text-[#65705f]">Filtrelere uygun açılış projesi yok.</p> : null}
        </div>
      </div>
    </AppShell>
  );
}

async function loadOpeningsData(where: Prisma.OpeningProjectWhereInput) {
  try {
    const [items, statusCounts, riskCounts, cities, legacyCount] = await Promise.all([
      prisma.openingProject.findMany({
        where,
        include: {
          branch: { select: { branchName: true, city: true, status: true } },
          stages: { orderBy: { sortOrder: "asc" } },
          milestones: true,
          risks: { where: { status: { in: ["OPEN", "WATCHING"] } } },
          _count: { select: { tasks: true, documents: true, budgetItems: true } },
        },
        orderBy: { targetOpeningDate: "asc" },
      }),
      prisma.openingProject.groupBy({ by: ["status"], where: { archivedAt: null }, _count: { _all: true } }),
      prisma.openingProject.groupBy({ by: ["riskLevel"], where: { archivedAt: null }, _count: { _all: true } }),
      prisma.openingProject.findMany({ distinct: ["city"], where: { archivedAt: null }, select: { city: true }, orderBy: { city: "asc" } }),
      prisma.branchOpening.count({ where: { archivedAt: null, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    ]);

    return { items, statusCounts, riskCounts, cities, legacyCount, setupError: null };
  } catch (error) {
    console.error("[openings] page data load failed", error);
    return { ...emptyOpeningsData, setupError: "OPENINGS_DATA_LOAD_FAILED" };
  }
}

function Kpi({ title, value, icon, danger = false }: { title: string; value: number; icon: React.ReactNode; danger?: boolean }) {
  return (
    <Card className={`p-4 shadow-none ${danger ? "border-rose-200" : ""}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#65705f]">{title}</p>
        <span className={danger ? "text-rose-700" : "text-[#2f5f20]"}>{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold">{value.toLocaleString("tr-TR")}</p>
    </Card>
  );
}

function Select({ name, value, first, options }: { name: string; value: string; first: string; options: [string, string][] }) {
  return (
    <select name={name} defaultValue={value} className="h-10 rounded-lg border px-3 text-sm">
      <option value="">{first}</option>
      {options.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select>
  );
}
