import type { Prisma } from "@prisma/client";
import { MapPinned } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { BranchMapView } from "@/components/branches/branch-map-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { branchScopeWhere } from "@/lib/branch-access";
import { branchConceptColor, branchConceptIcon, branchConceptLabel, safeBranchConceptCode } from "@/lib/branch-concepts";
import { BRANCH_STATUSES, label } from "@/lib/franchise";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;

const value = (params: Params, key: string) => (typeof params[key] === "string" ? params[key] : "");
const values = (params: Params, key: string) => {
  const raw = params[key];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "string" && raw) return raw.split(",").filter(Boolean);
  return [];
};

export default async function BranchMapPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requirePermission("branches");
  const params = await searchParams;
  const conceptIds = values(params, "concept");
  const status = value(params, "status");
  const city = value(params, "city");
  const ownershipType = value(params, "ownershipType");
  const scope = await branchScopeWhere();
  const where: Prisma.BranchWhereInput = { archivedAt: null, ...scope };

  if (conceptIds.length) where.OR = [{ conceptId: { in: conceptIds } }, { concept: { in: conceptIds } }];
  if (status) where.status = status;
  if (city) where.city = city;
  if (ownershipType) where.ownershipType = ownershipType;

  const [branches, concepts, cities] = await Promise.all([
    prisma.branch.findMany({
      where,
      select: {
        id: true,
        branchName: true,
        city: true,
        district: true,
        address: true,
        status: true,
        ownershipType: true,
        openingDate: true,
        latitude: true,
        longitude: true,
        concept: true,
        conceptRelation: true,
        franchisee: { select: { companyName: true, contactName: true } },
        lastAuditScore: true,
      },
      orderBy: [{ city: "asc" }, { branchName: "asc" }],
      take: 500,
    }),
    prisma.branchConcept.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.branch.findMany({ where: { archivedAt: null }, select: { city: true }, distinct: ["city"], orderBy: { city: "asc" } }),
  ]);

  const mapped = branches.map((branch) => ({
    id: branch.id,
    branchName: branch.branchName,
    city: branch.city,
    district: branch.district,
    address: branch.address,
    status: label(BRANCH_STATUSES, branch.status),
    ownershipType: branch.ownershipType,
    openingDate: branch.openingDate?.toISOString() ?? null,
    latitude: branch.latitude,
    longitude: branch.longitude,
    concept: {
      name: branchConceptLabel(branch.conceptRelation, branch.concept),
      code: safeBranchConceptCode(branch.conceptRelation, branch.concept),
      color: branchConceptColor(branch.conceptRelation, branch.concept),
      icon: branchConceptIcon(branch.conceptRelation, branch.concept),
    },
    ownerName: branch.franchisee?.companyName ?? branch.franchisee?.contactName ?? null,
    lastAuditScore: branch.lastAuditScore,
  }));
  const located = mapped.filter((branch): branch is typeof mapped[number] & { latitude: number; longitude: number } => branch.latitude != null && branch.longitude != null);
  const missingLocation = mapped.filter((branch) => branch.latitude == null || branch.longitude == null);
  const conceptCounts = located.reduce<Record<string, number>>((acc, branch) => {
    acc[branch.concept.name] = (acc[branch.concept.name] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <AppShell activeHref="/branch-map" eyebrow="Şube ağı görünümü" title="Şube Haritası">
      <div className="space-y-5">
        <Card className="p-4 shadow-none">
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <MultiConceptFilter concepts={concepts} selected={conceptIds} />
            <Select name="status" current={status} first="Tüm durumlar" options={Object.entries(BRANCH_STATUSES)} />
            <Select name="city" current={city} first="Tüm şehirler" options={cities.map((item) => [item.city, item.city])} />
            <Select name="ownershipType" current={ownershipType} first="Tüm sahiplikler" options={[["FRANCHISE", "Franchise"], ["COMPANY_OWNED", "Merkez Şube"]]} />
            <div className="flex gap-2 xl:col-span-6">
              <Button>Filtrele</Button>
              <Button asChild type="button" variant="outline">
                <a href="/branch-map">Temizle</a>
              </Button>
            </div>
          </form>
        </Card>

        <section className="grid gap-3 md:grid-cols-4">
          <Metric label="Konumlu Şube" value={located.length} />
          <Metric label="Konumu Eksik" value={missingLocation.length} />
          <Metric label="Şehir" value={new Set(located.map((branch) => branch.city)).size} />
          <Metric label="Konsept" value={Object.keys(conceptCounts).length} />
        </section>

        <BranchMapView branches={located} />

        {missingLocation.length ? (
          <Card className="p-4 shadow-none">
            <h2 className="flex items-center gap-2 font-semibold">
              <MapPinned className="size-5" />
              Konumu eksik şubeler
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {missingLocation.map((branch) => (
                <Badge key={branch.id} variant="outline">
                  {branch.branchName} · {branch.city}
                </Badge>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}

function MultiConceptFilter({ concepts, selected }: { concepts: { id: string; name: string; color: string }[]; selected: string[] }) {
  return (
    <fieldset className="rounded-lg border p-3 md:col-span-2 xl:col-span-3">
      <legend className="px-1 text-sm font-medium">Konsept</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {concepts.map((concept) => (
          <label key={concept.id} className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
            <input name="concept" value={concept.id} type="checkbox" defaultChecked={selected.includes(concept.id)} />
            <span className="size-2 rounded-full" style={{ backgroundColor: concept.color }} />
            {concept.name}
          </label>
        ))}
      </div>
    </fieldset>
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4 shadow-none">
      <p className="text-sm text-[#65705f]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value.toLocaleString("tr-TR")}</p>
    </Card>
  );
}
