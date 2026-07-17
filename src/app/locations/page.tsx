import Link from "next/link";
import type { CandidateLocation, CandidateLocationDocument, Prisma } from "@prisma/client";
import { FileText, Grid2X2, ListFilter, MapPinned, Plus, Search } from "lucide-react";

import { archiveLocation } from "@/app/locations/actions";
import { AppShell } from "@/components/app-shell";
import { LocationForm, LocationImportForm } from "@/components/locations/location-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import {
  CONCEPT_SUITABILITY_LABELS,
  LOCATION_STATUS_LABELS,
  LOCATION_TYPE_LABELS,
  conceptSuitabilityLabel,
  dateTR,
  hasReport,
  locationStatusLabel,
  locationTypeLabel,
  money,
  numberTR,
} from "@/lib/locations";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = Record<string, string | string[] | undefined>;
type LocationRow = CandidateLocation & {
  documents: CandidateLocationDocument[];
  _count: { leadMatches: number };
};

const emptyData: {
  locations: LocationRow[];
  totals: { status: string; _count: { _all: number } }[];
  cities: { city: string }[];
  setupError: string | null;
} = {
  locations: [],
  totals: [],
  cities: [],
  setupError: null,
};

const get = (params: Params, key: string) => {
  const value = params[key];
  return Array.isArray(value) ? value[0] || "" : value || "";
};

export const dynamic = "force-dynamic";

export default async function LocationsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireUser();
  const canCreate = hasPermission(user.role, "locations.create");
  const canArchive = hasPermission(user.role, "locations.archive");
  const canViewFinancials = hasPermission(user.role, "locations.view_financials");
  const p = await searchParams;
  const q = get(p, "q");
  const city = get(p, "city");
  const district = get(p, "district");
  const locationType = get(p, "locationType");
  const status = get(p, "status");
  const concept = get(p, "concept");
  const report = get(p, "report");
  const matched = get(p, "matched");
  const archive = get(p, "archive");
  const areaMin = numberParam(get(p, "areaMin"));
  const areaMax = numberParam(get(p, "areaMax"));
  const rentMin = numberParam(get(p, "rentMin"));
  const rentMax = numberParam(get(p, "rentMax"));
  const transferMin = numberParam(get(p, "transferMin"));
  const transferMax = numberParam(get(p, "transferMax"));
  const totalMin = numberParam(get(p, "totalMin"));
  const totalMax = numberParam(get(p, "totalMax"));

  const where: Prisma.CandidateLocationWhereInput = {};
  if (archive === "archived") where.archivedAt = { not: null };
  else if (archive !== "all") where.archivedAt = null;
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { mallName: { contains: q } },
      { city: { contains: q } },
      { district: { contains: q } },
      { fullAddress: { contains: q } },
      { currentBusinessName: { contains: q } },
      { contactName: { contains: q } },
    ];
  }
  if (city) where.city = { contains: city };
  if (district) where.district = { contains: district };
  if (locationType) where.locationType = locationType as Prisma.EnumLocationTypeFilter["equals"];
  if (status) where.status = status as Prisma.EnumLocationStatusFilter["equals"];
  if (concept) where.conceptSuitability = concept as Prisma.EnumConceptSuitabilityFilter["equals"];
  if (areaMin || areaMax) where.areaM2 = { gte: areaMin ?? undefined, lte: areaMax ?? undefined };
  if (rentMin || rentMax) where.monthlyRent = { gte: rentMin ?? undefined, lte: rentMax ?? undefined };
  if (transferMin || transferMax) where.transferFee = { gte: transferMin ?? undefined, lte: transferMax ?? undefined };
  if (totalMin || totalMax) where.estimatedTotalInvestment = { gte: totalMin ?? undefined, lte: totalMax ?? undefined };
  if (report === "ready") where.documents = { some: { archivedAt: null, documentType: { in: ["LOCATION_ANALYSIS_PDF", "LOCATION_ANALYSIS_JPEG"] } } };
  if (report === "waiting") where.documents = { none: { archivedAt: null, documentType: { in: ["LOCATION_ANALYSIS_PDF", "LOCATION_ANALYSIS_JPEG"] } } };
  if (matched === "yes") where.leadMatches = { some: {} };
  if (matched === "no") where.leadMatches = { none: {} };

  const data = await loadLocationsData(where);
  const { locations, totals, cities, setupError } = data;
  const countFor = (key: string) => totals.find((item) => item.status === key)?._count._all ?? 0;
  const totalCount = totals.reduce((sum, item) => sum + item._count._all, 0);
  const reportReadyCount = locations.filter((location) => hasReport(location.documents)).length;

  return (
    <AppShell activeHref="/locations" eyebrow="Lead eşleştirme havuzu" title="Aday Lokasyonlar">
      <div className="space-y-5">
        {setupError ? (
          <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-none">
            Aday Lokasyonlar veri tabanı hazırlığı tamamlanmamış görünüyor. Production migration koruması eklendi; deploy sonrası bu ekran otomatik çalışır hale gelecektir.
          </Card>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Kpi title="Toplam Aday Lokasyon" value={totalCount} href="/locations" />
          <Kpi title="Raporu Hazır Lokasyon" value={reportReadyCount} href="/locations?report=ready" />
          <Kpi title="Yatırımcı Bekleyen" value={countFor("WAITING_FOR_INVESTOR")} href="/locations?status=WAITING_FOR_INVESTOR" />
          <Kpi title="Görüşme Aşamasındaki" value={countFor("IN_NEGOTIATION")} href="/locations?status=IN_NEGOTIATION" />
          <Kpi title="Onaylanan" value={countFor("APPROVED")} href="/locations?status=APPROVED" />
          <Kpi title="Pasif Lokasyon" value={countFor("PASSIVE")} href="/locations?status=PASSIVE" />
        </div>

        <Card className="p-4 shadow-none">
          <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <label className="relative md:col-span-2">
              <Search className="absolute left-3 top-3 size-4 text-[#65705f]" />
              <input name="q" defaultValue={q} placeholder="Lokasyon, AVM, şehir, ilçe veya adres ara" className="h-10 w-full rounded-lg border pl-9 pr-3 text-sm" />
            </label>
            <input name="city" list="location-cities" defaultValue={city} placeholder="Şehir" className="h-10 rounded-lg border px-3 text-sm" />
            <datalist id="location-cities">{cities.map((item) => <option key={item.city} value={item.city} />)}</datalist>
            <input name="district" defaultValue={district} placeholder="İlçe" className="h-10 rounded-lg border px-3 text-sm" />
            <Select name="locationType" value={locationType} label="Tüm tipler" options={LOCATION_TYPE_LABELS} />
            <Select name="status" value={status} label="Tüm durumlar" options={LOCATION_STATUS_LABELS} />
            <Select name="concept" value={concept} label="Tüm konseptler" options={CONCEPT_SUITABILITY_LABELS} />
            <Select name="report" value={report} label="Rapor durumu" options={{ ready: "Rapor Hazır", waiting: "Rapor Bekleniyor" }} />
            <Select name="matched" value={matched} label="Lead eşleşmesi" options={{ yes: "Eşleşmiş", no: "Eşleşmemiş" }} />
            <Select name="archive" value={archive} label="Aktif / arşiv" options={{ active: "Aktif", archived: "Arşiv", all: "Tümü" }} />
            <Range nameMin="areaMin" nameMax="areaMax" min={get(p, "areaMin")} max={get(p, "areaMax")} placeholder="m²" />
            <Range nameMin="rentMin" nameMax="rentMax" min={get(p, "rentMin")} max={get(p, "rentMax")} placeholder="Kira" />
            <Range nameMin="transferMin" nameMax="transferMax" min={get(p, "transferMin")} max={get(p, "transferMax")} placeholder="Devir" />
            <Range nameMin="totalMin" nameMax="totalMax" min={get(p, "totalMin")} max={get(p, "totalMax")} placeholder="Toplam yatırım" />
            <div className="flex gap-2 xl:col-span-2">
              <Button className="flex-1">
                <ListFilter className="size-4" />
                Filtrele
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href="/locations">Temizle</Link>
              </Button>
            </div>
          </form>
        </Card>

        {canCreate ? (
          <details className="rounded-lg border bg-white p-4">
            <summary className="flex cursor-pointer items-center gap-2 font-semibold">
              <Plus className="size-4" />
              Yeni Aday Lokasyon Ekle
            </summary>
            <div className="mt-4">
              <LocationForm />
            </div>
          </details>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <Card className="overflow-hidden shadow-none">
            <div className="flex items-center gap-2 border-b p-4">
              <MapPinned className="size-5" />
              <h2 className="font-semibold">Lokasyon Listesi</h2>
              <Badge variant="secondary">{locations.length} kayıt</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] text-left text-sm">
                <thead className="bg-[#f8faf6] text-xs uppercase text-[#65705f]">
                  <tr>{["Lokasyon Adı", "Şehir", "İlçe", "Tip", "m²", "Aylık Kira", "Devir Bedeli", "Toplam Tahmini Yatırım", "Konsept", "Durum", "Rapor", "Bağlı Lead", "Sorumlu", "Son Güncelleme", "İşlem"].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {locations.map((location) => (
                    <tr key={location.id}>
                      <td className="px-4 py-4">
                        <Link href={`/locations/${location.id}`} className="font-semibold hover:underline">{location.name}</Link>
                        {location.mallName ? <p className="text-xs text-[#65705f]">{location.mallName}</p> : null}
                      </td>
                      <td className="px-4 py-4">{location.city}</td>
                      <td className="px-4 py-4">{location.district || "-"}</td>
                      <td className="px-4 py-4">{locationTypeLabel(location.locationType)}</td>
                      <td className="px-4 py-4">{numberTR(location.areaM2, " m²")}</td>
                      <td className="px-4 py-4">{canViewFinancials ? money(location.monthlyRent) : "Yetkisiz"}</td>
                      <td className="px-4 py-4">{canViewFinancials ? money(location.transferFee) : "Yetkisiz"}</td>
                      <td className="px-4 py-4">{canViewFinancials ? money(location.estimatedTotalInvestment) : "Yetkisiz"}</td>
                      <td className="px-4 py-4">{conceptSuitabilityLabel(location.conceptSuitability)}</td>
                      <td className="px-4 py-4"><Badge>{locationStatusLabel(location.status)}</Badge></td>
                      <td className="px-4 py-4"><Badge className={hasReport(location.documents) ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{hasReport(location.documents) ? "Rapor Hazır" : "Rapor Bekleniyor"}</Badge></td>
                      <td className="px-4 py-4">{location._count.leadMatches}</td>
                      <td className="px-4 py-4">{location.assignedUserId || "Atanmadı"}</td>
                      <td className="px-4 py-4">{dateTR(location.updatedAt)}</td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <Button asChild size="sm" variant="outline"><Link href={`/locations/${location.id}`}>Görüntüle</Link></Button>
                          {canArchive && !location.archivedAt ? <form action={archiveLocation.bind(null, location.id)}><Button size="sm" variant="outline">Arşivle</Button></form> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!locations.length ? <tr><td colSpan={15} className="p-12 text-center text-[#65705f]">Filtrelere uygun aday lokasyon bulunamadı.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="space-y-4">
            <LocationImportForm />
            <Card className="p-4 shadow-none">
              <div className="flex items-center gap-2">
                <Grid2X2 className="size-5" />
                <h2 className="font-semibold">Kart Görünümü</h2>
              </div>
              <div className="mt-4 space-y-3">
                {locations.slice(0, 6).map((location) => (
                  <Link key={location.id} href={`/locations/${location.id}`} className="block rounded-lg border p-4 hover:bg-[#f8faf6]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{location.name}</p>
                        <p className="mt-1 text-sm text-[#65705f]">{location.city}{location.district ? ` / ${location.district}` : ""}</p>
                      </div>
                      <FileText className={hasReport(location.documents) ? "size-5 text-emerald-700" : "size-5 text-amber-700"} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="secondary">{locationTypeLabel(location.locationType)}</Badge>
                      <Badge>{locationStatusLabel(location.status)}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

async function loadLocationsData(where: Prisma.CandidateLocationWhereInput) {
  try {
    const [locations, totals, cities] = await Promise.all([
      prisma.candidateLocation.findMany({
        where,
        include: {
          documents: { where: { archivedAt: null }, orderBy: { createdAt: "desc" } },
          _count: { select: { leadMatches: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
      prisma.candidateLocation.groupBy({
        by: ["status"],
        where: { archivedAt: null },
        _count: { _all: true },
      }),
      prisma.candidateLocation.findMany({
        where: { archivedAt: null },
        distinct: ["city"],
        select: { city: true },
        orderBy: { city: "asc" },
      }),
    ]);

    return { locations, totals, cities, setupError: null };
  } catch (error) {
    console.error("[locations] page data load failed", error);
    return { ...emptyData, setupError: "LOCATIONS_DATA_LOAD_FAILED" };
  }
}

function Kpi({ title, value, href }: { title: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-lg border bg-white p-4 shadow-none hover:border-[#17201b]">
      <p className="text-xs font-medium uppercase text-[#65705f]">{title}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </Link>
  );
}

function Select({ name, value, label, options }: { name: string; value: string; label: string; options: Record<string, string> }) {
  return (
    <select name={name} defaultValue={value} className="h-10 rounded-lg border px-3 text-sm">
      <option value="">{label}</option>
      {Object.entries(options).map(([key, text]) => (
        <option key={key} value={key}>{text}</option>
      ))}
    </select>
  );
}

function Range({ nameMin, nameMax, min, max, placeholder }: { nameMin: string; nameMax: string; min: string; max: string; placeholder: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <input name={nameMin} type="number" defaultValue={min} placeholder={`${placeholder} min`} className="h-10 min-w-0 rounded-lg border px-3 text-sm" />
      <input name={nameMax} type="number" defaultValue={max} placeholder={`${placeholder} max`} className="h-10 min-w-0 rounded-lg border px-3 text-sm" />
    </div>
  );
}

function numberParam(value: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
