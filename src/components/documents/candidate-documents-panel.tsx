"use client";

import { useActionState } from "react";
import { Archive, Download, Eye, FileImage, FileText, LoaderCircle, Share2, Undo2, Upload } from "lucide-react";
import { archiveDocument, restoreDocument, toggleDocumentShared, uploadCandidateDocuments, type DocumentActionState } from "@/app/documents/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { documentTypeLabel, formatFileSize, type DocumentType } from "@/lib/documents";
import type { CandidateDocumentView } from "@/types/candidate";

const initial:DocumentActionState={success:false,message:""};

export function CandidateDocumentsPanel({candidateId,documents}:{candidateId:string;documents:CandidateDocumentView[]}){
  const active=documents.filter(d=>!d.archivedAt);
  const latestVersion=active[0]?.version;
  const previous=active.filter(d=>latestVersion&&d.version!==latestVersion);
  const pdf=active.filter(d=>d.documentType==="LOCATION_ANALYSIS_PDF"&&d.version===latestVersion);
  const visuals=active.filter(d=>d.documentType==="LOCATION_ANALYSIS_VISUAL"&&d.version===latestVersion);
  return <div className="space-y-6">
    <div className="grid gap-4 lg:grid-cols-2"><UploadForm candidateId={candidateId} type="LOCATION_ANALYSIS_PDF" title="Ana PDF Raporu" accept=".pdf,application/pdf" multiple={false}/><UploadForm candidateId={candidateId} type="LOCATION_ANALYSIS_VISUAL" title="Analiz Grafikleri ve Görseller" accept=".jpg,.jpeg,.png,image/jpeg,image/png" multiple/></div>
    <DocumentGroup title="Ana PDF Raporu" description="Cowork üzerinden hazırlanan tamamlanmış PDF raporları." documents={pdf}/>
    <DocumentGroup title="Analiz Grafikleri ve Görseller" description="Rapora bağlı JPEG ve PNG görselleri." documents={visuals}/>
    {previous.length>0&&<DocumentGroup title="Önceki Versiyonlar" description="Güncel versiyondan önce yüklenen dosyalar." documents={previous}/>} 
    {documents.some(d=>d.archivedAt)&&<DocumentGroup title="Arşivlenen Dosyalar" description="Gerekirse tekrar aktif hale getirilebilir." documents={documents.filter(d=>d.archivedAt)} archived/>}
  </div>;
}

function UploadForm({candidateId,type,title,accept,multiple}:{candidateId:string;type:DocumentType;title:string;accept:string;multiple:boolean}){
  const [state,action,pending]=useActionState(uploadCandidateDocuments.bind(null,candidateId,type),initial);
  return <form action={action} className="space-y-4 rounded-lg border border-[#dfe4dc] bg-[#f8faf6] p-4"><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-[#65705f]">Dosya başına en fazla 25 MB.</p></div><label className="grid gap-2 text-sm font-medium"><span>Dosya</span><input required name="files" type="file" multiple={multiple} accept={accept} className="block w-full rounded-lg border bg-white p-2 text-sm"/></label><label className="grid gap-2 text-sm font-medium"><span>Versiyon</span><input required name="version" placeholder="Örn. 1.0" className="h-10 rounded-lg border bg-white px-3"/></label><label className="grid gap-2 text-sm font-medium"><span>Açıklama</span><textarea name="description" rows={3} className="rounded-lg border bg-white p-3"/></label>{state.message&&<p role="status" className={`rounded-lg p-3 text-sm ${state.success?"bg-emerald-50 text-emerald-700":"bg-rose-50 text-rose-700"}`}>{state.message}</p>}<Button disabled={pending} className="w-full bg-[#17201b] text-white">{pending?<LoaderCircle className="size-4 animate-spin"/>:<Upload className="size-4"/>}{pending?"Yükleniyor...":"Yükle / Yeni Versiyon"}</Button></form>;
}

function DocumentGroup({title,description,documents,archived=false}:{title:string;description:string;documents:CandidateDocumentView[];archived?:boolean}){
  return <section><div className="mb-3"><h3 className="font-semibold">{title}</h3><p className="text-sm text-[#65705f]">{description}</p></div><div className="space-y-3">{documents.map(document=><article key={document.id} className="rounded-lg border border-[#edf0e9] bg-white p-4"><div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div className="flex min-w-0 gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#ecfbdc] text-[#2f5f20]">{document.mimeType==="application/pdf"?<FileText className="size-5"/>:<FileImage className="size-5"/>}</span><div className="min-w-0"><p className="truncate font-semibold">{document.originalFileName}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#65705f]"><Badge variant="outline">{documentTypeLabel(document.documentType)}</Badge><span>Versiyon {document.version}</span><span>· {formatFileSize(document.fileSize)}</span></div><p className="mt-1 text-xs text-[#65705f]">Yükleme: {formatDate(document.uploadedAt)} · {document.uploadedBy||"Sistem"}</p>{document.description&&<p className="mt-3 whitespace-pre-wrap text-sm">{document.description}</p>}<p className={`mt-2 text-xs font-medium ${document.customerShared?"text-emerald-700":"text-amber-700"}`}>{document.customerShared?`Müşteriyle paylaşıldı · ${formatDate(document.customerSharedAt)}`:"Müşteriyle paylaşılmadı"}</p></div></div><div className="flex shrink-0 flex-wrap gap-2"><Button asChild size="sm" variant="outline"><a href={`/api/documents/${document.id}`} target="_blank" rel="noreferrer"><Eye className="size-4"/>Görüntüle</a></Button><Button asChild size="sm" variant="outline"><a href={`/api/documents/${document.id}?download=1`}><Download className="size-4"/>İndir</a></Button>{!archived&&<form action={toggleDocumentShared.bind(null,document.id)}><Button size="sm" variant="outline"><Share2 className="size-4"/>{document.customerShared?"Paylaşımı Geri Al":"Paylaşıldı İşaretle"}</Button></form>}<form action={(archived?restoreDocument:archiveDocument).bind(null,document.id)}><Button size="sm" variant="outline" className={archived?"text-emerald-700":"text-rose-700"}>{archived?<Undo2 className="size-4"/>:<Archive className="size-4"/>}{archived?"Geri Al":"Arşivle"}</Button></form></div></div></article>)}{!documents.length&&<p className="rounded-lg border border-dashed border-[#dfe4dc] p-8 text-center text-sm text-[#65705f]">Bu bölümde henüz dosya yok. İlk dosyayı yukarıdaki yükleme alanından ekleyebilirsiniz.</p>}</div></section>;
}

function formatDate(value:string){return value?new Intl.DateTimeFormat("tr-TR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value)):"—"}
