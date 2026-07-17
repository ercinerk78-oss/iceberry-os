import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, Download, Eye, FileImage, FileText, MapPinned, Trash2 } from "lucide-react";

import { archiveLocationDocument, unlinkLocationMatch } from "@/app/locations/actions";
import { AppShell } from "@/components/app-shell";
import { LeadLocationLinkForm, LocationDocumentUpload, LocationForm, MatchUpdateForm } from "@/components/locations/location-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import {
  conceptSuitabilityLabel,
  dateTR,
  hasReport,
  locationDocumentTypeLabel,
  locationStatusLabel,
  locationTypeLabel,
  matchStatusLabel,
  money,
  numberTR,
  sourceTypeLabel,
} from "@/lib/locations";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const canUpdate = hasPermission(user.role, "locations.update");
  const canUpload = hasPermission(user.role, "locations.upload_document");
  const canLinkLead = hasPermission(user.role, "locations.link_lead");
  const canViewFinancials = hasPermission(user.role, "locations.view_financials");

  const location = await prisma.candidateLocation.findUnique({
    where: { id },
    include: {
      documents: { where: { archivedAt: null }, orderBy: { createdAt: "desc" } },
      leadMatches: {
        include: {
          lead: { select: { id: true, fullName: true, phone: true, city: true, requestedConcept: true, leadCategory: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!location) notFound();

  const [leads, locations] = await Promise.all([
    prisma.lead.findMany({
      where: { convertedCandidateId: null },
      select: { id: true, fullName: true, city: true, phone: true },
      orderBy: { leadDate: "desc" },
      take: 100,
    }),
    prisma.candidateLocation.findMany({
      where: { archivedAt: null },
      select: { id: true, name: true, city: true, district: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
  ]);

  const reports = location.documents.filter((document) => ["LOCATION_ANALYSIS_PDF", "LOCATION_ANALYSIS_JPEG"].includes(document.documentType));
  const photos = location.documents.filter((document) => document.documentType === "LOCATION_PHOTO");
  const otherDocuments = location.documents.filter((document) => !reports.includes(document) && !photos.includes(document));

  return (
    <AppShell activeHref="/locations" eyebrow="Lokasyon detay ve eşleştirme" title={location.name}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline"><Link href="/locations">Aday Lokasyonlara Dön</Link></Button>
          <div className="flex flex-wrap gap-2">
            <Badge>{locationStatusLabel(location.status)}</Badge>
            <Badge variant="secondary">{locationTypeLabel(location.locationType)}</Badge>
            <Badge className={hasReport(location.documents) ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{hasReport(location.documents) ? "Rapor Hazır" : "Rapor Bekleniyor"}</Badge>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto rounded-lg border bg-white p-3">
          {["Genel Bilgiler", "Finansal Bilgiler", "Raporlar ve Dosyalar", "Fotoğraflar", "Bağlı Leadler", "Görüşmeler", "Timeline", "Notlar"].map((tab) => (
            <a key={tab} href={`#${slug(tab)}`} className="shrink-0 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-[#f8faf6]">{tab}</a>
          ))}
        </nav>

        <section id={slug("Genel Bilgiler")} className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <Card className="p-5 shadow-none">
            <div className="flex items-center gap-2">
              <MapPinned className="size-5" />
              <h2 className="font-semibold">Genel Bilgiler</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Info label="Şehir" value={location.city} />
              <Info label="İlçe" value={location.district || "Belirtilmedi"} />
              <Info label="Adres" value={location.fullAddress || "Belirtilmedi"} />
              <Info label="Koordinat" value={location.latitude && location.longitude ? `${location.latitude}, ${location.longitude}` : "Belirtilmedi"} />
              <Info label="Lokasyon Tipi" value={locationTypeLabel(location.locationType)} />
              <Info label="m²" value={numberTR(location.areaM2, " m²")} />
              <Info label="Konsept Uygunluğu" value={conceptSuitabilityLabel(location.conceptSuitability)} />
              <Info label="Mevcut İşletme" value={location.currentBusinessName || "Belirtilmedi"} />
              <Info label="Kaynak" value={sourceTypeLabel(location.sourceType)} />
              <Info label="İletişim" value={[location.contactName, location.contactPhone, location.contactEmail].filter(Boolean).join(" · ") || "Belirtilmedi"} />
            </div>
          </Card>
          {canUpdate ? (
            <details className="rounded-lg border bg-white p-4">
              <summary className="cursor-pointer font-semibold">Lokasyonu Düzenle</summary>
              <div className="mt-4">
                <LocationForm location={location} />
              </div>
            </details>
          ) : null}
        </section>

        <section id={slug("Finansal Bilgiler")}>
          <Card className="p-5 shadow-none">
            <h2 className="font-semibold">Finansal Bilgiler</h2>
            {canViewFinancials ? (
              <div className="mt-4 grid gap-3 md:grid-cols-5">
                <Info label="Kira" value={money(location.monthlyRent)} />
                <Info label="Ciro Kirası" value={numberTR(location.turnoverRentRate, "%")} />
                <Info label="Devir" value={money(location.transferFee)} />
                <Info label="Kurulum Tahmini" value={money(location.estimatedSetupCost)} />
                <Info label="Toplam Yatırım" value={money(location.estimatedTotalInvestment)} />
              </div>
            ) : (
              <p className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">Bu rol finansal lokasyon detaylarını görüntüleyemez.</p>
            )}
          </Card>
        </section>

        <section id={slug("Raporlar ve Dosyalar")} className="grid gap-5 xl:grid-cols-[340px_1fr]">
          {canUpload ? <LocationDocumentUpload locationId={location.id} /> : null}
          <Card className="p-5 shadow-none">
            <h2 className="font-semibold">Raporlar ve Dosyalar</h2>
            <DocumentGroup title="Lokasyon Analiz Raporları" documents={reports} />
            <DocumentGroup title="Diğer Dosyalar" documents={otherDocuments} />
          </Card>
        </section>

        <section id={slug("Fotoğraflar")}>
          <Card className="p-5 shadow-none">
            <h2 className="font-semibold">Fotoğraflar</h2>
            <DocumentGroup title="Lokasyon Fotoğrafları" documents={photos} compact />
          </Card>
        </section>

        <section id={slug("Bağlı Leadler")} className="grid gap-5 xl:grid-cols-[340px_1fr]">
          {canLinkLead ? <LeadLocationLinkForm leads={leads} locations={locations} locationId={location.id} /> : null}
          <Card className="p-5 shadow-none">
            <h2 className="font-semibold">Bağlı Leadler</h2>
            <div className="mt-4 space-y-3">
              {location.leadMatches.map((match) => (
                <article key={match.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link href={`/leads/${match.leadId}`} className="font-semibold hover:underline">{match.lead.fullName}</Link>
                      <p className="mt-1 text-sm text-[#65705f]">{match.lead.city} · {match.lead.phone} · {match.lead.requestedConcept}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge>{matchStatusLabel(match.matchStatus)}</Badge>
                        {match.nextFollowUpAt ? <Badge variant="secondary">Takip: {dateTR(match.nextFollowUpAt)}</Badge> : null}
                      </div>
                    </div>
                    {canLinkLead ? <form action={unlinkLocationMatch.bind(null, match.id)}><Button size="sm" variant="outline"><Trash2 className="size-4" />Bağlantıyı Kaldır</Button></form> : null}
                  </div>
                  {canLinkLead ? <div className="mt-4"><MatchUpdateForm match={match} /></div> : null}
                </article>
              ))}
              {!location.leadMatches.length ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-[#65705f]">Bu lokasyona henüz lead bağlanmadı.</p> : null}
            </div>
          </Card>
        </section>

        <section id={slug("Görüşmeler")}><Placeholder title="Görüşmeler" text="Lokasyon görüşmeleri bağlı lead aktiviteleri ve görevleri üzerinden izlenir." /></section>
        <section id={slug("Timeline")}><Placeholder title="Timeline" text="Lead eşleştirme hareketleri ilgili lead zaman çizelgesine otomatik yazılır." /></section>
        <section id={slug("Notlar")}><Placeholder title="Notlar" text={location.internalNotes || location.description || "Bu lokasyon için ek not bulunmuyor."} /></section>
      </div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-[#f8faf6] p-4">
      <p className="text-xs font-medium uppercase text-[#65705f]">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}

function DocumentGroup({ title, documents, compact = false }: { title: string; documents: { id: string; fileName: string; originalFileName: string; documentType: string; mimeType: string; fileSize: number; description: string | null; createdAt: Date }[]; compact?: boolean }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className={compact ? "mt-3 grid gap-3 md:grid-cols-3" : "mt-3 space-y-3"}>
        {documents.map((document) => (
          <article key={document.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                {document.mimeType.startsWith("image/") ? <FileImage className="size-5 shrink-0" /> : <FileText className="size-5 shrink-0" />}
                <div className="min-w-0">
                  <p className="truncate font-semibold">{document.originalFileName}</p>
                  <p className="mt-1 text-xs text-[#65705f]">{locationDocumentTypeLabel(document.documentType)} · {dateTR(document.createdAt)}</p>
                  {document.description ? <p className="mt-2 text-sm">{document.description}</p> : null}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button asChild size="sm" variant="outline"><a href={`/api/locations/documents/${document.fileName}`} target="_blank"><Eye className="size-4" />Aç</a></Button>
                <Button asChild size="sm" variant="outline"><a href={`/api/locations/documents/${document.fileName}?download=1`}><Download className="size-4" />İndir</a></Button>
                <form action={archiveLocationDocument.bind(null, document.id)}><Button size="sm" variant="outline"><Archive className="size-4" />Sil</Button></form>
              </div>
            </div>
          </article>
        ))}
        {!documents.length ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-[#65705f]">Bu bölümde dosya bulunmuyor.</p> : null}
      </div>
    </div>
  );
}

function Placeholder({ title, text }: { title: string; text: string }) {
  return (
    <Card className="p-5 shadow-none">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#65705f]">{text}</p>
    </Card>
  );
}

function slug(value: string) {
  return value.toLocaleLowerCase("tr-TR").replaceAll(" ", "-");
}
