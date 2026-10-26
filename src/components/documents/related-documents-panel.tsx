"use client";

import { useActionState, useState } from "react";
import { Archive, Download, Eye, FileText, Upload } from "lucide-react";

import { archiveDocument, uploadRelatedDocuments, type DocumentActionState } from "@/app/documents/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { documentTypeLabel, formatFileSize, type DocumentType } from "@/lib/documents";

type Doc = {
  id: string;
  originalFileName: string;
  documentType: string;
  version: string;
  description: string | null;
  fileSize: number;
  uploadedAt: string | Date;
  archivedAt: string | Date | null;
};

const initial: DocumentActionState = { success: false, message: "" };
const standard: DocumentType[] = ["FRANCHISE_AGREEMENT", "LEASE_DOCUMENT", "COMPANY_DOCUMENT", "OTHER"];
const openingTypes: DocumentType[] = ["ARCHITECTURAL_PROJECT", "MALL_APPROVAL", "MUNICIPAL_DOCUMENT", "LEASE_DOCUMENT", "PRODUCTION_FILE", "SHIPMENT_DOCUMENT", "TRAINING_DOCUMENT", "OPENING_VISUAL", "OTHER"];
const standardAccept = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,application/pdf,image/jpeg,image/png,application/msword,application/vnd.ms-excel,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip,application/x-zip-compressed";

export function RelatedDocumentsPanel({
  relation,
  relationId,
  documents,
  fixedType,
}: {
  relation: "franchisee" | "branch" | "opening";
  relationId: string;
  documents: Doc[];
  fixedType?: DocumentType;
}) {
  const options = relation === "opening" ? openingTypes : standard;
  const [type, setType] = useState<DocumentType>(fixedType ?? options[0]);
  const [state, action, pending] = useActionState(uploadRelatedDocuments.bind(null, relation, relationId, type), initial);
  const visible = documents.filter((document) => !document.archivedAt && (fixedType ? document.documentType === fixedType : true));

  return (
    <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
      <form action={action} className="space-y-4 rounded-lg border bg-[#f8faf6] p-4">
        <h3 className="font-semibold">{fixedType ? "Yeni Versiyon Yükle" : "Doküman Yükle"}</h3>
        {!fixedType ? (
          <label className="grid gap-2 text-sm font-medium">
            <span>Doküman Türü</span>
            <select value={type} onChange={(event) => setType(event.target.value as DocumentType)} className="h-10 rounded-lg border bg-white px-3">
              {options.map((item) => <option key={item} value={item}>{documentTypeLabel(item)}</option>)}
            </select>
          </label>
        ) : null}
        <label className="grid gap-2 text-sm font-medium">
          <span>Dosya</span>
          <input
            required
            multiple
            type="file"
            name="files"
            accept={fixedType === "BRANCH_DEVELOPMENT_STRATEGY" ? ".pdf,application/pdf" : standardAccept}
            className="rounded-lg border bg-white p-2"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          <span>Versiyon</span>
          <input required name="version" defaultValue="1.0" placeholder="Örn. 1.0" className="h-10 rounded-lg border bg-white px-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          <span>Açıklama</span>
          <textarea name="description" rows={4} className="rounded-lg border bg-white p-3" />
        </label>
        {state.message ? <p className={`rounded-lg p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{state.message}</p> : null}
        <Button disabled={pending} className="w-full"><Upload />{pending ? "Yükleniyor..." : "Yükle"}</Button>
      </form>

      <div className="space-y-3">
        {visible.map((document) => (
          <article key={document.id} className="rounded-lg border p-4">
            <div className="flex flex-col gap-3 md:flex-row md:justify-between">
              <div className="flex gap-3">
                <FileText className="size-5" />
                <div>
                  <p className="font-semibold">{document.originalFileName}</p>
                  <div className="mt-1 flex gap-2 text-sm text-[#65705f]">
                    <Badge variant="outline">{documentTypeLabel(document.documentType)}</Badge>
                    <span>v{document.version} · {formatFileSize(document.fileSize)}</span>
                  </div>
                  <p className="mt-1 text-xs text-[#65705f]">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(document.uploadedAt))}</p>
                  {document.description ? <p className="mt-2 text-sm">{document.description}</p> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline"><a href={`/api/documents/${document.id}`} target="_blank" rel="noreferrer"><Eye />Görüntüle</a></Button>
                <Button asChild size="sm" variant="outline"><a href={`/api/documents/${document.id}?download=1`}><Download />İndir</a></Button>
                <form action={archiveDocument.bind(null, document.id)}>
                  <Button size="sm" variant="outline"><Archive />Arşivle</Button>
                </form>
              </div>
            </div>
          </article>
        ))}
        {!visible.length ? <p className="rounded-lg border border-dashed p-10 text-center text-sm text-[#65705f]">Henüz doküman yüklenmedi.</p> : null}
      </div>
    </div>
  );
}
