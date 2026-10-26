import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Archive, Download, Eye, FileText, RotateCcw, Search } from "lucide-react";

import { archiveDocument, restoreDocument } from "@/app/documents/actions";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DOCUMENT_TYPES, documentTypeLabel, formatFileSize } from "@/lib/documents";
import { prisma } from "@/lib/prisma";
import { containsInsensitive } from "@/lib/search";

export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;
type LinkedProps = {
  document: {
    candidate: { id: string; fullName: string } | null;
    franchisee: { id: string; companyName: string } | null;
    branch: { id: string; branchName: string } | null;
    locationId: string | null;
  };
};

const DOCUMENT_LIST_LIMIT = 250;
const get = (params: Params, key: string) => (typeof params[key] === "string" ? params[key] as string : "");

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = get(params, "q");
  const type = get(params, "type");
  const relation = get(params, "relation");
  const shared = get(params, "shared");
  const archive = get(params, "archive");
  const date = get(params, "date");
  const where: Prisma.DocumentWhereInput = {};

  if (q) {
    where.OR = [
      { originalFileName: containsInsensitive(q) },
      { candidate: { fullName: containsInsensitive(q) } },
      { branch: { branchName: containsInsensitive(q) } },
      { locationId: containsInsensitive(q) },
    ];
  }
  if (type) where.documentType = type;
  if (relation === "candidate") where.candidateId = { not: null };
  if (relation === "branch") where.branchId = { not: null };
  if (relation === "location") where.locationId = { not: null };
  if (relation === "unlinked") where.AND = [{ candidateId: null }, { branchId: null }, { locationId: null }];
  if (shared === "yes") where.customerShared = true;
  if (shared === "no") where.customerShared = false;
  if (archive === "active") where.archivedAt = null;
  if (archive === "archived") where.archivedAt = { not: null };
  if (date) where.uploadedAt = { gte: new Date(`${date}T00:00:00`), lte: new Date(`${date}T23:59:59.999`) };

  const items = await prisma.document.findMany({
    where,
    include: {
      candidate: { select: { id: true, fullName: true } },
      franchisee: { select: { id: true, companyName: true } },
      branch: { select: { id: true, branchName: true } },
    },
    orderBy: { uploadedAt: "desc" },
    take: DOCUMENT_LIST_LIMIT,
  });

  return (
    <AppShell activeHref="/documents" eyebrow="Operasyon arşivi" title="Dokümanlar">
      <div className="space-y-4">
        <Card className="p-4 shadow-none">
          <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
            <label className="relative xl:col-span-2">
              <Search className="absolute left-3 top-3 size-4" />
              <input name="q" defaultValue={q} placeholder="Dosya, aday, lokasyon veya şube" className="h-10 w-full rounded-lg border pl-9 pr-3" />
            </label>
            <Select name="type" current={type} first="Tüm doküman türleri" options={Object.entries(DOCUMENT_TYPES)} />
            <Select name="relation" current={relation} first="Tüm bağlı kayıtlar" options={[["candidate", "Aday"], ["branch", "Şube"], ["location", "Lokasyon"], ["unlinked", "Bağlantısız"]]} />
            <Select name="shared" current={shared} first="Tüm paylaşım durumları" options={[["yes", "Paylaşıldı"], ["no", "Paylaşılmadı"]]} />
            <Select name="archive" current={archive} first="Tüm arşiv durumları" options={[["active", "Aktif"], ["archived", "Arşivlenmiş"]]} />
            <input type="date" name="date" defaultValue={date} aria-label="Yükleme tarihi" className="h-10 rounded-lg border px-3" />
            <div className="flex gap-2">
              <Button>Filtrele</Button>
              <Button asChild type="button" variant="outline"><Link href="/documents">Temizle</Link></Button>
            </div>
          </form>
        </Card>

        <Card className="overflow-hidden shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-[#f8faf6] text-xs uppercase text-[#65705f]">
                <tr>{["Doküman Adı", "Tür", "Bağlı Kayıt", "Versiyon", "Yükleme Tarihi", "Paylaşım", "İşlemler"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {items.map((document) => (
                  <tr key={document.id}>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <FileText className="size-4" />
                        <div>
                          <p className="max-w-52 truncate font-semibold">{document.originalFileName}</p>
                          <p className="text-xs text-[#65705f]">{formatFileSize(document.fileSize)}{document.archivedAt ? " · Arşivde" : ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">{documentTypeLabel(document.documentType)}</td>
                    <td className="px-4 py-4"><Linked document={document} /></td>
                    <td className="px-4 py-4"><Badge variant="outline">v{document.version}</Badge></td>
                    <td className="px-4 py-4">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(document.uploadedAt)}</td>
                    <td className="px-4 py-4"><Badge className={document.customerShared ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{document.customerShared ? "Paylaşıldı" : "Paylaşılmadı"}</Badge></td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <Button asChild size="sm" variant="outline"><a href={`/api/documents/${document.id}`} target="_blank" rel="noreferrer"><Eye />Görüntüle</a></Button>
                        <Button asChild size="sm" variant="outline"><a href={`/api/documents/${document.id}?download=1`}><Download />İndir</a></Button>
                        <form action={(document.archivedAt ? restoreDocument : archiveDocument).bind(null, document.id)}>
                          <Button size="sm" variant="outline">{document.archivedAt ? <RotateCcw /> : <Archive />}{document.archivedAt ? "Geri Al" : "Arşivle"}</Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
                {!items.length ? <tr><td colSpan={7} className="p-14 text-center text-[#65705f]">Filtrelere uygun doküman bulunamadı.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Linked({ document }: LinkedProps) {
  if (document.candidate) return <Link href={`/candidates/${document.candidate.id}`} className="font-medium underline">{document.candidate.fullName}</Link>;
  if (document.branch) return <Link href={`/branches/${document.branch.id}`} className="font-medium underline">{document.branch.branchName}</Link>;
  if (document.franchisee) return <span>{document.franchisee.companyName}</span>;
  return document.locationId ? `Lokasyon: ${document.locationId}` : "Bağlantısız";
}

function Select({ name, current, first, options }: { name: string; current: string; first: string; options: string[][] }) {
  return (
    <select name={name} defaultValue={current} aria-label={first} className="h-10 rounded-lg border px-3">
      <option value="">{first}</option>
      {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
  );
}
