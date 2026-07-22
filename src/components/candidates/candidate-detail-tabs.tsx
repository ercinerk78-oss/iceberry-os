"use client";

import type React from "react";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, CheckSquare, Clock3, MessageSquareText, Pencil, UserRound, X } from "lucide-react";

import { archiveCandidate, createInteraction, updateCandidate } from "@/app/candidates/actions";
import { CandidateForm } from "@/components/candidates/candidate-form";
import { CandidateTaskPanel } from "@/components/tasks/candidate-task-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatDate } from "@/lib/candidates";
import type { ActionState } from "@/lib/validations/candidate";
import type { Candidate } from "@/types/candidate";

const initial: ActionState = { success: false, message: "" };
const interactionTypes = ["Telefon", "WhatsApp", "E-posta", "Online toplantı", "Yüz yüze toplantı", "Lokasyon ziyareti", "Diğer"];

export function CandidateDetailTabs({ candidate }: { candidate: Candidate }) {
  const [tab, setTab] = useState<"general" | "notes" | "tasks" | "timeline">("general");
  const [edit, setEdit] = useState(false);
  const [note, setNote] = useState(false);
  const router = useRouter();
  const update = updateCandidate.bind(null, candidate.id);

  async function archive() {
    if (!window.confirm("Bu adayı arşivlemek istediğinize emin misiniz?")) return;
    const result = await archiveCandidate(candidate.id);
    if (result.success) router.push("/candidates");
    else window.alert(result.message);
  }

  return (
    <>
      <Card className="rounded-lg border-[#dfe4dc] bg-white shadow-none">
        <CardHeader className="border-b border-[#edf0e9]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <TabButton active={tab === "general"} onClick={() => setTab("general")} icon={<UserRound className="size-4" />}>Genel Bilgiler</TabButton>
              <TabButton active={tab === "notes"} onClick={() => setTab("notes")} icon={<MessageSquareText className="size-4" />}>Görüşme Notları</TabButton>
              <TabButton active={tab === "tasks"} onClick={() => setTab("tasks")} icon={<CheckSquare className="size-4" />}>Görevler</TabButton>
              <TabButton active={tab === "timeline"} onClick={() => setTab("timeline")} icon={<Clock3 className="size-4" />}>Zaman Çizelgesi</TabButton>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEdit(true)}><Pencil className="size-4" />Düzenle</Button>
              <Button variant="outline" onClick={archive} className="text-rose-700"><Archive className="size-4" />Arşivle</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {tab === "general" ? <General candidate={candidate} /> : null}
          {tab === "notes" ? <Interactions candidate={candidate} onAdd={() => setNote(true)} /> : null}
          {tab === "tasks" ? <CandidateTaskPanel candidateId={candidate.id} tasks={candidate.tasks} /> : null}
          {tab === "timeline" ? <TimelineEvents candidate={candidate} /> : null}
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
    </>
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

function Interactions({ candidate, onAdd }: { candidate: Candidate; onAdd: () => void }) {
  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Görüşme Notları</h3>
          <p className="text-sm text-[#65705f]">En yeni görüşme en üstte gösterilir.</p>
        </div>
        <Button onClick={onAdd} className="bg-[#17201b] text-white">Yeni Not Ekle</Button>
      </div>
      <div className="space-y-3">
        {candidate.interactions.map((interaction) => (
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
        {candidate.interactions.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-[#65705f]">Henüz görüşme notu eklenmemiş.</p> : null}
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

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return <Button type="button" onClick={onClick} className={active ? "bg-[#17201b] text-white" : "bg-[#f6f7f4] text-[#65705f]"}>{icon}{children}</Button>;
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
