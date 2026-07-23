import Link from "next/link";
import { notFound } from "next/navigation";

import { archiveBranch, setBranchStatus } from "@/app/branches/actions";
import { updateFranchisee } from "@/app/franchisees/actions";
import { AppShell } from "@/components/app-shell";
import { BranchForm } from "@/components/branches/branch-form";
import { RelatedDocumentsPanel } from "@/components/documents/related-documents-panel";
import { FranchiseeForm } from "@/components/franchisees/franchisee-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BRANCH_STATUSES, FRANCHISEE_STATUSES, formatDate, label } from "@/lib/franchise";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const tabs = ["Genel Bilgiler", "Şubeler", "Dokümanlar", "Bayi Geliştirme Stratejisi", "Görevler", "Notlar", "Finans"];

export default async function FranchiseeDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "Genel Bilgiler" } = await searchParams;
  const record = await prisma.franchisee.findUnique({
    where: { id },
    include: {
      candidate: { select: { id: true, fullName: true } },
      branches: {
        select: {
          id: true,
          branchName: true,
          city: true,
          status: true,
          archivedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      documents: { orderBy: { uploadedAt: "desc" } },
    },
  });

  if (!record) notFound();

  const values = {
    ...record,
    contractDate: record.contractDate?.toISOString() ?? "",
    contractStartDate: record.contractStartDate?.toISOString() ?? "",
    contractEndDate: record.contractEndDate?.toISOString() ?? "",
  };
  const update = updateFranchisee.bind(null, id);
  const conceptOptions = await prisma.branchConcept.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const defaultConcept = conceptOptions.find((concept) => concept.code === "CORNER") ?? conceptOptions[0];

  return (
    <AppShell activeHref="/branches" eyebrow="Şube bağlantısı" title={record.companyName}>
      <div className="space-y-4">
        <Card className="shadow-none">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <div className="flex gap-2">
                <Badge>{label(FRANCHISEE_STATUSES, record.status)}</Badge>
                {record.archivedAt ? <Badge variant="outline">Arşivde</Badge> : null}
              </div>
              <p className="mt-2 text-sm text-[#65705f]">
                {record.contactName} · {record.city}
                {record.district ? ` / ${record.district}` : ""} · {record.phone}
              </p>
              {record.candidate ? (
                <Link href={`/candidates/${record.candidate.id}`} className="mt-2 inline-block text-sm font-medium text-[#2f5f20] underline">
                  Kaynak aday: {record.candidate.fullName}
                </Link>
              ) : null}
            </div>
            <p className="text-sm text-[#65705f]">Sözleşme: {formatDate(record.contractDate)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="border-b">
            <nav className="flex flex-wrap gap-2">
              {tabs.map((item) => (
                <Button key={item} asChild variant={tab === item ? "default" : "outline"}>
                  <Link href={`/franchisees/${id}?tab=${encodeURIComponent(item)}`}>{item}</Link>
                </Button>
              ))}
            </nav>
          </CardHeader>
          <CardContent className="p-5">
            {tab === "Genel Bilgiler" ? <FranchiseeForm action={update} values={values} /> : null}
            {tab === "Şubeler" ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  {record.branches.map((branch) => (
                    <div key={branch.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <Link href={`/branches/${branch.id}`} className="font-semibold hover:underline">
                          {branch.branchName}
                        </Link>
                        <p className="text-sm text-[#65705f]">
                          {branch.city} · {label(BRANCH_STATUSES, branch.status)}
                          {branch.archivedAt ? " · Arşivde" : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!branch.archivedAt ? (
                          <>
                            <form action={setBranchStatus.bind(null, branch.id, branch.status === "ACTIVE" ? "PASSIVE" : "ACTIVE")}>
                              <Button size="sm" variant="outline">
                                {branch.status === "ACTIVE" ? "Pasife Al" : "Aktifleştir"}
                              </Button>
                            </form>
                            <form action={archiveBranch.bind(null, branch.id)}>
                              <Button size="sm" variant="outline">
                                Arşivle
                              </Button>
                            </form>
                          </>
                        ) : null}
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/branches/${branch.id}`}>Düzenle</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!record.branches.length ? (
                    <p className="rounded-lg border border-dashed p-8 text-center text-[#65705f]">Bu kayda bağlı şube yok.</p>
                  ) : null}
                </div>
                <div>
                  <h3 className="mb-4 font-semibold">Yeni Şube Ekle</h3>
                  <BranchForm
                    action={(await import("@/app/branches/actions")).createBranch}
                    values={{
                      franchiseeId: id,
                      branchName: record.companyName,
                      city: record.city,
                      district: record.district ?? "",
                      address: record.address ?? "",
                      conceptId: defaultConcept?.id ?? "",
                      concept: defaultConcept?.code ?? "CORNER",
                      locationType: "OTHER",
                      status: "CONTRACTED",
                    }}
                    conceptOptions={conceptOptions}
                  />
                </div>
              </div>
            ) : null}
            {tab === "Dokümanlar" ? <RelatedDocumentsPanel relation="franchisee" relationId={id} documents={record.documents} /> : null}
            {tab === "Bayi Geliştirme Stratejisi" ? (
              <RelatedDocumentsPanel relation="franchisee" relationId={id} documents={record.documents} fixedType="BRANCH_DEVELOPMENT_STRATEGY" />
            ) : null}
            {["Görevler", "Notlar", "Finans"].includes(tab) ? <Empty title={tab} /> : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Empty({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed p-12 text-center">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[#65705f]">Bu bölüm sonraki geliştirme adımında şube kayıtlarına bağlanacak.</p>
    </div>
  );
}
