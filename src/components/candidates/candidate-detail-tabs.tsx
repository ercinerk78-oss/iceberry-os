"use client";

import type React from "react";
import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import type { MatchStatus } from "@prisma/client";
import { Archive, CheckSquare, Clock3, FileText, MapPinned, MessageSquareText, Pencil, UserRound, X } from "lucide-react";

import { archiveCandidateWithReason, createInteraction, updateCandidate } from "@/app/candidates/actions";
import { unlinkCandidateLocationMatch } from "@/app/locations/actions";
import { CandidateForm } from "@/components/candidates/candidate-form";
import { CandidateDocumentsPanel } from "@/components/documents/candidate-documents-panel";
import { CandidateLocationLinkForm, CandidateMatchUpdateForm } from "@/components/locations/location-forms";
import { CandidateTaskPanel } from "@/components/tasks/candidate-task-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatDate } from "@/lib/candidates";
import { hasReport, locationStatusLabel, matchStatusLabel, money, numberTR } from "@/lib/locations";
import type { ActionState } from "@/lib/validations/candidate";
import type { Candidate } from "@/types/candidate";

const initial: ActionState = { success: false, message: "" };
const interactionTypes = ["Telefon", "WhatsApp", "E-posta", "Online toplantı", "Yüz yüze toplantı", "Lokasyon ziyareti", "Diğer"];
type DetailTab = "general" | "notes" | "locations" | "tasks" | "timeline" | "documents";
type LazyTab = Exclude<DetailTab, "general">;
type LocationOption = { id: string; name: string; city: string; district: string | null };
type LazyPayload = { candidate: Candidate; availableLocations: LocationOption[] };

export function CandidateDetailTabs({
  candidate,
  availableLocations = [],
  activeTab = "general",
}: {
  candidate: Candidate;
  availableLocations?: { id: string; name: string; city: string; district: string | null }[];
  activeTab?: DetailTab;
}) {
  const [edit, setEdit] = useState(false);
  const [note, setNote] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<DetailTab>(activeTab);
  const [tabData, setTabData] = useState<Partial<Record<LazyTab, LazyPayload>>>({});
  const [loadingTab, setLoadingTab] = useState<LazyTab | null>(activeTab === "general" ? null : activeTab);
  const [tabError, setTabError] = useState("");
  const update = updateCandidate.bind(null, candidate.id);
  const activeCandidate = selectedTab === "general" ? candidate : tabData[selectedTab as LazyTab]?.candidate ?? candidate;
  const activeLocations = selectedTab === "locations" ? tabData.locations?.availableLocations ?? availableLocations : availableLocations;

  useEffect(() => {
    if (selectedTab === "general" || tabData[selectedTab as LazyTab]) return;

    let cancelled = false;
    const tab = selectedTab as LazyTab;

    fetch(`/api/candidates/${candidate.id}/detail?tab=${tab}`)
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json().catch(() => null))?.message || "Sekme verisi yüklenemedi.");
        return response.json() as Promise<LazyPayload>;
      })
      .then((payload) => {
        if (!cancelled) setTabData((current) => ({ ...current, [tab]: payload }));
      })
      .catch((error) => {
        if (!cancelled) setTabError(error instanceof Error ? error.message : "Sekme verisi yüklenemedi.");
      })
      .finally(() => {
        if (!cancelled) setLoadingTab(null);
      });

    return () => {
      cancelled = true;
    };
  }, [candidate.id, selectedTab, tabData]);

  const changeTab = (tab: DetailTab) => {
    setSelectedTab(tab);
    setTabError("");
    setLoadingTab(tab === "general" || tabData[tab as LazyTab] ? null : (tab as LazyTab));
    const suffix = tab === "general" ? "" : `?tab=${tab}`;
    window.history.pushState(null, "", `/candidates/${candidate.id}${suffix}`);
  };

  return (
    <>
      <Card className="rounded-lg border-[#dfe4dc] bg-white shadow-none">
        <CardHeader className="border-b border-[#edf0e9]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <TabButton tab="general" active={selectedTab === "general"} onSelect={changeTab} icon={<UserRound className="size-4" />}>Genel Bilgiler</TabButton>
              <TabButton tab="notes" active={selectedTab === "notes"} onSelect={changeTab} icon={<MessageSquareText className="size-4" />}>Görüşme Notları</TabButton>
              <TabButton tab="locations" active={selectedTab === "locations"} onSelect={changeTab} icon={<MapPinned className="size-4" />}>Aday Lokasyonlar</TabButton>
              <TabButton tab="tasks" active={selectedTab === "tasks"} onSelect={changeTab} icon={<CheckSquare className="size-4" />}>Görevler</TabButton>
              <TabButton tab="timeline" active={selectedTab === "timeline"} onSelect={changeTab} icon={<Clock3 className="size-4" />}>Zaman Çizelgesi</TabButton>
              <TabButton tab="documents" active={selectedTab === "documents"} onSelect={changeTab} icon={<FileText className="size-4" />}>Lokasyon Analizi</TabButton>
            </div>
            <div className="flex gap-2">
              {candidate.archivedAt ? (
                <Badge variant="outline">Pasif Aday</Badge>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setEdit(true)}><Pencil className="size-4" />Düzenle</Button>
                  <Button variant="outline" onClick={() => setArchiveOpen(true)} className="text-amber-700"><Archive className="size-4" />Pasife Al</Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {selectedTab !== "general" && loadingTab === selectedTab ? <TabLoading /> : null}
          {selectedTab !== "general" && tabError ? <TabError message={tabError} /> : null}
          {selectedTab === "general" ? (
            <div className="space-y-5">
              <General candidate={candidate} />
              <Interactions candidate={candidate} onAdd={() => setNote(true)} compact />
            </div>
          ) : null}
          {selectedTab !== "general" && loadingTab !== selectedTab && !tabError ? (
            <>
              {selectedTab === "notes" ? <Interactions candidate={activeCandidate} onAdd={() => setNote(true)} /> : null}
              {selectedTab === "locations" ? <CandidateLocations candidate={activeCandidate} availableLocations={activeLocations} /> : null}
              {selectedTab === "tasks" ? <CandidateTaskPanel candidateId={candidate.id} tasks={activeCandidate.tasks} /> : null}
              {selectedTab === "timeline" ? <TimelineEvents candidate={activeCandidate} /> : null}
            </>
          ) : null}
          {selectedTab === "documents" && loadingTab !== selectedTab && !tabError ? (
            <CandidateDocumentsPanel
              candidateId={candidate.id}
              documents={activeCandidate.documents.filter((document) => ["LOCATION_ANALYSIS_PDF", "LOCATION_ANALYSIS_VISUAL"].includes(document.documentType))}
            />
          ) : null}
        </CardContent>
      </Card>
      {edit ? (
        <Modal title="Adayı Düzenle" onClose={() => setEdit(false)}>
          <CandidateForm candidate={candidate} action={update} conceptOptions={candidate.concepts.map((item) => item.name)} tagOptions={candidate.tags.map((tag) => tag.name)} onCancel={() => setEdit(false)} onSuccess={() => setEdit(false)} />
        </Modal>
      ) : null}
      {note ? (
        <Modal title="Yeni Görüşme Notu" onClose={() => setNote(false)}>
          <InteractionForm candidateId={candidate.id} onClose={() => setNote(false)} />
        </Modal>
      ) : null}
      {archiveOpen ? (
        <Modal title="Adayı Pasife Al" onClose={() => setArchiveOpen(false)}>
          <ArchiveCandidateForm candidate={candidate} onClose={() => setArchiveOpen(false)} />
        </Modal>
      ) : null}
    </>
  );
}

function TabLoading() {
  return (
    <div className="rounded-lg border border-dashed border-[#dfe4dc] bg-[#f8faf6] p-8 text-center text-sm text-[#65705f]">
      Sekme verileri yükleniyor...
    </div>
  );
}

function TabError({ message }: { message: string }) {
  return <p className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{message}</p>;
}

function CandidateLocations({ candidate, availableLocations }: { candidate: Candidate; availableLocations: { id: string; name: string; city: string; district: string | null }[] }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
      <CandidateLocationLinkForm candidateId={candidate.id} candidates={[{ id: candidate.id, fullName: candidate.fullName, city: candidate.city, phone: candidate.phone }]} locations={availableLocations} />
      <div className="space-y-3">
        {candidate.locationMatches.map((match) => {
          const report = match.location.documents.find((document) => ["LOCATION_ANALYSIS_PDF", "LOCATION_ANALYSIS_JPEG"].includes(document.documentType));

          return (
            <article key={match.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/locations/${match.location.id}`} className="font-semibold hover:underline">{match.location.name}</Link>
                  <p className="mt-1 text-sm text-[#65705f]">{match.location.city}{match.location.district ? ` / ${match.location.district}` : ""} · {numberTR(match.location.areaM2, " m²")} · {money(match.location.monthlyRent)} kira · {money(match.location.transferFee)} devir</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge>{matchStatusLabel(match.matchStatus)}</Badge>
                    <Badge variant="secondary">{locationStatusLabel(match.location.status)}</Badge>
                    <Badge className={hasReport(match.location.documents) ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{hasReport(match.location.documents) ? "Rapor Hazır" : "Rapor Bekleniyor"}</Badge>
                    {match.nextFollowUpAt ? <Badge variant="secondary">Takip: {formatDate(match.nextFollowUpAt)}</Badge> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {report ? <Button asChild size="sm" variant="outline"><a href={`/api/locations/documents/${report.fileName}`} target="_blank">Raporu Aç</a></Button> : null}
                  <form action={unlinkCandidateLocationMatch.bind(null, match.id)}><Button size="sm" variant="outline">Bağlantıyı Kaldır</Button></form>
                </div>
              </div>
              <div className="mt-4">
                <CandidateMatchUpdateForm match={{ id: match.id, matchStatus: match.matchStatus as MatchStatus, nextFollowUpAt: match.nextFollowUpAt ? new Date(match.nextFollowUpAt) : null, notes: match.notes }} />
              </div>
            </article>
          );
        })}
        {!candidate.locationMatches.length ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-[#65705f]">Bu adaya henüz aday lokasyon bağlanmadı.</p> : null}
      </div>
    </div>
  );
}

function ArchiveCandidateForm({ candidate, onClose }: { candidate: Candidate; onClose: () => void }) {
  const [state, action, pending] = useActionState(archiveCandidateWithReason.bind(null, candidate.id), initial);

  return (
    <form action={action} className="grid gap-4 p-5">
      <p className="text-sm leading-6 text-[#65705f]">
        {candidate.fullName} ana aday listesinden çıkarılacak ve Pasif Adaylar alanında saklanacak. Şube veya açılış projesi bağlantısı varsa işlem engellenir.
      </p>
      <label className="grid gap-2">
        <span className="text-sm font-medium">Pasife alma nedeni</span>
        <textarea name="reason" required minLength={5} rows={4} placeholder="Neden pasife alındığını yazın" className="rounded-lg border bg-[#f8faf6] p-3" />
      </label>
      {state.message ? <p className={`rounded-lg p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{state.message}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Vazgeç</Button>
        {state.success ? (
          <Button asChild className="bg-[#17201b] text-white"><Link href="/candidates">Aktif Aday Listesine Dön</Link></Button>
        ) : (
          <Button disabled={pending} className="bg-[#17201b] text-white">{pending ? "İşleniyor..." : "Adayı Pasife Al"}</Button>
        )}
      </div>
    </form>
  );
}

function General({ candidate }: { candidate: Candidate }) {
  const fields = [
    ["Ad Soyad", candidate.fullName],
    ["Telefon", candidate.phone],
    ["WhatsApp", candidate.whatsapp || "—"],
    ["E-posta", candidate.email || "—"],
    ["Konum", `${candidate.city} / ${candidate.district || "Belirtilmedi"}`],
    ["Ülke", candidate.country],
    ["Yatırım Bütçesi", `${candidate.investmentBudget} ${candidate.currency}`],
    ["Konseptler", candidate.concepts.map((item) => item.name).join(", ") || candidate.interestedConcept],
    ["Aday Puanı", candidate.qualificationScore ? `${candidate.qualificationScore}/10` : "Puansız"],
    ["Durum", candidate.status],
    ["Sıcaklık", candidate.temperature],
    ["Son Görüşme", formatDate(candidate.lastContactAt)],
    ["Sonraki Takip", formatDate(candidate.nextFollowUpAt)],
    ["Kaynak", candidate.source],
    ["Etiketler", candidate.tags.map((tag) => tag.name).join(", ") || "—"],
    ["Kayıp Nedeni", candidate.lostReason || "—"],
    ["Genel Notlar", candidate.generalNotes || "—"],
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {fields.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4">
          <p className="text-xs font-medium uppercase text-[#65705f]">{label}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm font-semibold">{value}</p>
        </div>
      ))}
    </div>
  );
}

function Interactions({ candidate, onAdd, compact = false }: { candidate: Candidate; onAdd: () => void; compact?: boolean }) {
  const interactions = compact ? candidate.interactions.slice(0, 5) : candidate.interactions;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">{compact ? "Son Görüşme Notları" : "Görüşme Notları"}</h3>
          <p className="text-sm text-[#65705f]">{compact ? "Aday açılışında en son 5 görüşme gösterilir." : "En yeni görüşme en üstte gösterilir."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {compact ? <Button asChild variant="outline"><Link href={`/candidates/${candidate.id}?tab=notes`}>Tüm Notlar</Link></Button> : null}
          <Button onClick={onAdd} className="bg-[#17201b] text-white">Yeni Not Ekle</Button>
        </div>
      </div>
      <div className="space-y-3">
        {interactions.map((interaction) => (
          <div key={interaction.id} className="relative rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2"><Badge className="bg-[#17201b] text-white">{interaction.interactionType}</Badge><strong>{interaction.title}</strong></div>
              <time className="text-xs text-[#65705f]">{formatDate(interaction.interactionDate)}</time>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#364036]">{interaction.description}</p>
            {interaction.nextAction ? <p className="mt-3 text-sm"><strong>Sonraki aksiyon:</strong> {interaction.nextAction}</p> : null}
            {interaction.reminderAt ? <p className="mt-1 text-sm"><strong>Hatırlatma:</strong> {formatDate(interaction.reminderAt)}</p> : null}
          </div>
        ))}
        {interactions.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-[#65705f]">Henüz görüşme notu eklenmemiş.</p> : null}
      </div>
    </div>
  );
}

function TimelineEvents({ candidate }: { candidate: Candidate }) {
  const events = candidate.timelineEvents;

  if (!events.length) return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-[#65705f]">Henüz zaman çizelgesi kaydı yok.</p>;

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={event.id} className="relative flex gap-3">
          <div className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#17201b] text-[#a8ff60]"><Clock3 className="size-4" /></div>
          <div className="min-w-0 flex-1 rounded-lg bg-[#f8faf6] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">{event.title}</p>
              <Badge variant="secondary">{event.eventType}</Badge>
            </div>
            {event.description ? <p className="mt-1 text-sm leading-6 text-[#65705f]">{event.description}</p> : null}
            <time className="mt-2 block text-xs text-[#8a9484]">{formatDate(event.eventDate)}{event.actorName ? ` · ${event.actorName}` : ""}</time>
          </div>
        </div>
      ))}
    </div>
  );
}

function InteractionForm({ candidateId, onClose }: { candidateId: string; onClose: () => void }) {
  const action = createInteraction.bind(null, candidateId);
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="grid gap-4 p-5">
      <label className="grid gap-2"><span className="text-sm font-medium">Görüşme Türü</span><select name="interactionType" className="h-10 rounded-lg border px-3">{interactionTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
      <Field name="title" label="Başlık" />
      <label className="grid gap-2"><span className="text-sm font-medium">Açıklama</span><textarea required name="description" rows={5} className="rounded-lg border bg-[#f8faf6] p-3" /></label>
      <Field name="interactionDate" label="Görüşme Tarihi" type="datetime-local" />
      <Field name="nextAction" label="Sonraki Aksiyon" />
      <Field name="reminderAt" label="Hatırlatma Tarihi" type="datetime-local" />
      {state.message ? <p className={`rounded-lg p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{state.message}</p> : null}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Vazgeç</Button><Button disabled={pending} className="bg-[#17201b] text-white">{pending ? "Ekleniyor..." : "Notu Ekle"}</Button></div>
    </form>
  );
}

function Field({ name, label, type = "text" }: { name: string; label: string; type?: string }) {
  return <label className="grid gap-2"><span className="text-sm font-medium">{label}</span><input required={name === "title" || name === "interactionDate"} name={name} type={type} className="h-10 rounded-lg border bg-[#f8faf6] px-3" /></label>;
}

function TabButton({ active, tab, icon, children, onSelect }: { active: boolean; tab: DetailTab; icon: React.ReactNode; children: React.ReactNode; onSelect: (tab: DetailTab) => void }) {
  return (
    <Button type="button" onClick={() => onSelect(tab)} className={active ? "bg-[#17201b] text-white" : "bg-[#f6f7f4] text-[#65705f]"}>
      {icon}
      {children}
    </Button>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[#17201b]/40 p-3 backdrop-blur-sm md:items-center md:justify-center">
      <div className="max-h-[92vh] w-full overflow-auto rounded-lg bg-white md:max-w-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="size-4" /></Button>
        </div>
        {children}
      </div>
    </div>
  );
}

