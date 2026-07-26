"use client";

import type React from "react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, MapPin, Search, Star } from "lucide-react";

import { movePipelineItem } from "@/app/pipeline/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/candidates";
import { leadCategoryLabel, leadStatusLabel, type LeadView } from "@/lib/leads";
import { isOpenTask, LEAD_PIPELINE_STAGES, LEAD_STAGE_STATUS, PIPELINE_STAGES, stageForLeadStatus } from "@/lib/pipeline";
import type { Candidate } from "@/types/candidate";

const ALL = "Tümü";
type PipelineItem =
  | { type: "candidate"; id: string; stage: string; date: string; candidate: Candidate; lead?: never }
  | { type: "lead"; id: string; stage: string; date: string; lead: LeadView; candidate?: never };
type MoveHandler = (itemType: "candidate" | "lead", id: string, stage: string) => void;

export function PipelineBoard({ candidates: initialCandidates, leads: initialLeads = [] }: { candidates: Candidate[]; leads?: LeadView[] }) {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [leads, setLeads] = useState(initialLeads);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [city, setCity] = useState(ALL);
  const [concept, setConcept] = useState(ALL);
  const [temperature, setTemperature] = useState(ALL);
  const [source, setSource] = useState(ALL);
  const [owner, setOwner] = useState(ALL);
  const [budget, setBudget] = useState(ALL);
  const [follow, setFollow] = useState(ALL);
  const [overdue, setOverdue] = useState(false);
  const [hot, setHot] = useState(false);

  const items = useMemo<PipelineItem[]>(() => {
    const candidateItems = candidates.map((candidate) => ({
      type: "candidate" as const,
      id: candidate.id,
      stage: candidate.status,
      date: candidate.updatedAt,
      candidate,
    }));
    const leadItems = leads.map((lead) => ({
      type: "lead" as const,
      id: lead.id,
      stage: stageForLeadStatus(lead.processStatus || lead.status),
      date: lead.leadDate,
      lead,
    }));

    return [...leadItems, ...candidateItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [candidates, leads]);

  const options = (values: string[]) => Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "tr"));
  const cityOptions = options([...candidates.map((candidate) => candidate.city), ...leads.map((lead) => lead.city)]);
  const sourceOptions = options([...candidates.map((candidate) => candidate.source), ...leads.map((lead) => lead.source)]);
  const ownerOptions = options([...candidates.map((candidate) => candidate.assignedUserId), ...leads.map((lead) => lead.assignedUserId)]);
  const budgetOptions = options([...candidates.map((candidate) => candidate.investmentBudget), ...leads.map((lead) => lead.investmentBudget)]);
  const temperatureOptions = options(candidates.map((candidate) => candidate.temperature));
  const conceptOptions = options([
    ...candidates.flatMap((candidate) => [candidate.interestedConcept, ...candidate.concepts.map((item) => item.name)]),
    ...leads.flatMap((lead) => [lead.requestedConcept, ...lead.concepts.map((item) => item.name)]),
  ]);

  const filtered = useMemo(() => {
    const query = q.toLocaleLowerCase("tr");

    return items.filter((item) => {
      const record = item.type === "candidate" ? item.candidate : item.lead;
      const concepts = item.type === "candidate"
        ? [item.candidate.interestedConcept, ...item.candidate.concepts.map((conceptItem) => conceptItem.name)]
        : [item.lead.requestedConcept, ...item.lead.concepts.map((conceptItem) => conceptItem.name)];
      const tasks = item.type === "candidate" ? item.candidate.tasks : item.lead.tasks ?? [];
      const notes = item.type === "candidate"
        ? [
            item.candidate.generalNotes,
            ...item.candidate.tags.map((tag) => tag.name),
            ...item.candidate.interactions.flatMap((interaction) => [interaction.title, interaction.description, interaction.nextAction]),
          ]
        : [
            item.lead.description,
            leadCategoryLabel(item.lead.leadCategory),
            ...item.lead.activities.map((activity) => activity.description),
          ];
      const nextFollowUpAt = item.type === "candidate" ? item.candidate.nextFollowUpAt : item.lead.nextFollowUpAt;
      const now = new Date();
      const next = nextFollowUpAt ? new Date(nextFollowUpAt) : null;
      const isLate = !!next && next < now;
      const today = next && next.toDateString() === now.toDateString();
      const week = next && next >= now && next.getTime() <= now.getTime() + 7 * 86400000;
      const isHot = item.type === "candidate"
        ? ["Sıcak", "Çok Sıcak"].includes(item.candidate.temperature) || (item.candidate.qualificationScore ?? 0) >= 8
        : ["POSITIVE", "CLOSE_FOLLOW_UP"].includes(item.lead.leadCategory);
      const text = [
        record.fullName,
        record.phone,
        record.city,
        record.email,
        record.source,
        item.type === "candidate" ? item.candidate.investmentBudget : item.lead.investmentBudget,
        ...concepts,
        ...notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr");

      return (
        (!query || text.includes(query)) &&
        (city === ALL || record.city === city) &&
        (concept === ALL || concepts.includes(concept)) &&
        (temperature === ALL || (item.type === "candidate" && item.candidate.temperature === temperature)) &&
        (source === ALL || record.source === source) &&
        (owner === ALL || (item.type === "candidate" ? item.candidate.assignedUserId : item.lead.assignedUserId) === owner) &&
        (budget === ALL || (item.type === "candidate" ? item.candidate.investmentBudget : item.lead.investmentBudget) === budget) &&
        (!overdue || isLate || tasks.some((task) => isOpenTask(task.status) && new Date(task.dueDate) < now)) &&
        (!hot || isHot) &&
        (follow === ALL || (follow === "Bugün" && today) || (follow === "7 Gün" && week) || (follow === "Gecikmiş" && isLate))
      );
    });
  }, [budget, city, concept, follow, hot, items, overdue, owner, q, source, temperature]);

  function drop(itemType: "candidate" | "lead", id: string, stage: string) {
    const beforeCandidates = candidates;
    const beforeLeads = leads;
    setMessage(null);

    if (itemType === "lead" && !isLeadStageAllowed(stage)) {
      setMessage({ ok: false, text: "Lead kaydı bu aşamaya taşınmadan önce franchise adayına dönüştürülmelidir." });
      return;
    }

    if (itemType === "candidate") {
      setCandidates((current) => current.map((candidate) => candidate.id === id ? { ...candidate, status: stage } : candidate));
    } else {
      setLeads((current) =>
        current.map((lead) => lead.id === id ? { ...lead, status: LEAD_STAGE_STATUS[stage as keyof typeof LEAD_STAGE_STATUS], processStatus: LEAD_STAGE_STATUS[stage as keyof typeof LEAD_STAGE_STATUS] } : lead),
      );
    }

    startTransition(async () => {
      const result = await movePipelineItem(itemType, id, stage);
      setMessage({ ok: result.success, text: result.message });
      if (!result.success) {
        setCandidates(beforeCandidates);
        setLeads(beforeLeads);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#dfe4dc] bg-white p-4">
        <div className="flex flex-col gap-1 pb-4">
          <h2 className="font-semibold">Birleşik Satış Süreci</h2>
          <p className="text-sm text-[#65705f]">
            {candidates.length} aday ve {leads.length} dönüştürülmemiş lead Kanban üzerinde birlikte izleniyor.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="flex h-10 items-center gap-2 rounded-lg border bg-[#f8faf6] px-3 xl:col-span-2">
            <Search className="size-4" />
            <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Ad, telefon, not, etiket veya konsept ara" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
          <Filter value={city} set={setCity} items={cityOptions} label="Şehir" />
          <Filter value={concept} set={setConcept} items={conceptOptions} label="Konsept" />
          <Filter value={temperature} set={setTemperature} items={temperatureOptions} label="Sıcaklık" />
          <Filter value={source} set={setSource} items={sourceOptions} label="Lead kaynağı" />
          <Filter value={owner} set={setOwner} items={ownerOptions} label="Sorumlu" />
          <Filter value={budget} set={setBudget} items={budgetOptions} label="Bütçe" />
          <Filter value={follow} set={setFollow} items={["Bugün", "7 Gün", "Gecikmiş"]} label="Takip tarihi" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={overdue ? "default" : "outline"} onClick={() => setOverdue(!overdue)} className={overdue ? "bg-rose-700 text-white" : ""}>Gecikmiş takipler</Button>
            <Button type="button" variant={hot ? "default" : "outline"} onClick={() => setHot(!hot)} className={hot ? "bg-orange-600 text-white" : ""}>Sıcak / 8+ puan</Button>
          </div>
        </div>
      </div>
      {message ? <div role="status" className={`rounded-lg p-3 text-sm ${message.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{message.text}</div> : null}
      <div className={`flex gap-4 overflow-x-auto pb-4 ${pending ? "opacity-80" : ""}`}>
        {PIPELINE_STAGES.map((stage) => (
          <section
            key={stage}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const type = event.dataTransfer.getData("itemType");
              if (type === "candidate" || type === "lead") drop(type, event.dataTransfer.getData("itemId"), stage);
            }}
            className="min-h-[420px] w-[310px] shrink-0 rounded-lg border border-[#dfe4dc] bg-[#eef1eb] p-3"
          >
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{stage}</h2>
              <Badge variant="secondary">{filtered.filter((item) => item.stage === stage).length}</Badge>
            </header>
            <div className="space-y-3">
              {filtered.filter((item) => item.stage === stage).map((item) => <PipelineCard key={`${item.type}-${item.id}`} item={item} onMove={drop} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function PipelineCard({ item, onMove }: { item: PipelineItem; onMove: MoveHandler }) {
  return item.type === "lead"
    ? <LeadPipelineCard item={item} onMove={onMove} />
    : <CandidatePipelineCard item={item} onMove={onMove} />;
}

function CandidatePipelineCard({ item, onMove }: { item: Extract<PipelineItem, { type: "candidate" }>; onMove: MoveHandler }) {
  const { candidate } = item;
  const overdueTask = candidate.tasks.some((task) => isOpenTask(task.status) && new Date(task.dueDate) < new Date());
  const lateFollow = !!candidate.nextFollowUpAt && new Date(candidate.nextFollowUpAt) < new Date();
  const concepts = candidate.concepts.length ? candidate.concepts.map((concept) => concept.name).join(", ") : candidate.interestedConcept;

  return (
    <article draggable onDragStart={(event) => setDragData(event, "candidate", candidate.id)} className="cursor-grab rounded-lg border border-[#dfe4dc] bg-white p-4 shadow-sm active:cursor-grabbing">
      <Link href={`/candidates/${candidate.id}`} className="font-semibold hover:underline">{candidate.fullName}</Link>
      <p className="mt-1 flex items-center gap-1 text-xs text-[#65705f]"><MapPin className="size-3" />{candidate.city} - {concepts}</p>
      <p className="mt-3 text-sm font-medium">{candidate.investmentBudget} {candidate.currency}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge className="bg-emerald-100 text-emerald-800">Aday</Badge>
        <Badge className="bg-orange-100 text-orange-800">{candidate.temperature}</Badge>
        <Badge className={scoreTone(candidate.qualificationScore)}><Star className="mr-1 size-3" />{candidate.qualificationScore ? `${candidate.qualificationScore}/10` : "Puansız"}</Badge>
        <Badge variant="secondary">{candidate.source}</Badge>
      </div>
      {candidate.tags.length ? <div className="mt-2 flex flex-wrap gap-1">{candidate.tags.slice(0, 3).map((tag) => <Badge key={tag.id || tag.name} variant="secondary" className="text-[11px]">{tag.name}</Badge>)}</div> : null}
      <PipelineMeta owner={candidate.assignedUserId} lastContactAt={candidate.lastContactAt} nextFollowUpAt={candidate.nextFollowUpAt} lateFollow={lateFollow} />
      {(overdueTask || lateFollow) ? <WarningText text={overdueTask ? "Gecikmiş görev" : "Gecikmiş takip"} /> : null}
      {!lateFollow && candidate.nextFollowUpAt ? <PlannedFollowUp /> : null}
      <StageSelect value={candidate.status} itemType="candidate" itemId={candidate.id} onMove={onMove} />
    </article>
  );
}

function LeadPipelineCard({ item, onMove }: { item: Extract<PipelineItem, { type: "lead" }>; onMove: MoveHandler }) {
  const { lead } = item;
  const overdueTask = lead.tasks?.some((task) => isOpenTask(task.status) && new Date(task.dueDate) < new Date()) ?? false;
  const lateFollow = !!lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < new Date();
  const concepts = lead.concepts.length ? lead.concepts.map((concept) => concept.name).join(", ") : lead.requestedConcept;

  return (
    <article draggable onDragStart={(event) => setDragData(event, "lead", lead.id)} className="cursor-grab rounded-lg border border-sky-200 bg-white p-4 shadow-sm active:cursor-grabbing">
      <Link href={`/candidates?leadId=${lead.id}`} className="font-semibold hover:underline">{lead.fullName}</Link>
      <p className="mt-1 flex items-center gap-1 text-xs text-[#65705f]"><MapPin className="size-3" />{lead.city} - {concepts}</p>
      <p className="mt-3 text-sm font-medium">{lead.investmentBudget || "Bütçe belirtilmedi"}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge className="bg-sky-100 text-sky-800">Lead</Badge>
        <Badge variant="secondary">{leadStatusLabel(lead.processStatus || lead.status)}</Badge>
        {lead.leadCategory ? <Badge variant="secondary">{leadCategoryLabel(lead.leadCategory)}</Badge> : null}
        <Badge variant="secondary">{lead.source}</Badge>
      </div>
      <PipelineMeta owner={lead.assignedUserId} lastContactAt={lead.lastContactAt} nextFollowUpAt={lead.nextFollowUpAt} lateFollow={lateFollow} />
      {(overdueTask || lateFollow) ? <WarningText text={overdueTask ? "Gecikmiş görev" : "Gecikmiş takip"} /> : null}
      {!lateFollow && lead.nextFollowUpAt ? <PlannedFollowUp /> : null}
      <StageSelect value={item.stage} itemType="lead" itemId={lead.id} onMove={onMove} />
    </article>
  );
}

function StageSelect({
  value,
  itemType,
  itemId,
  onMove,
}: {
  value: string;
  itemType: "candidate" | "lead";
  itemId: string;
  onMove: MoveHandler;
}) {
  return (
    <select aria-label="Satış aşamasını değiştir" value={value} onChange={(event) => onMove(itemType, itemId, event.target.value)} onPointerDown={(event) => event.stopPropagation()} className="mt-3 h-8 w-full rounded-md border border-[#d3d9cf] bg-white px-2 text-xs">
      {PIPELINE_STAGES.map((stage) => (
        <option key={stage} disabled={itemType === "lead" && !isLeadStageAllowed(stage)}>
          {stage}
        </option>
      ))}
    </select>
  );
}

function PipelineMeta({ owner, lastContactAt, nextFollowUpAt, lateFollow }: { owner: string; lastContactAt: string; nextFollowUpAt: string; lateFollow: boolean }) {
  return (
    <dl className="mt-3 grid gap-1 text-xs text-[#65705f]">
      <div><dt className="inline font-medium">Sorumlu: </dt><dd className="inline">{owner || "Atanmadı"}</dd></div>
      <div><dt className="inline font-medium">Son görüşme: </dt><dd className="inline">{formatDate(lastContactAt)}</dd></div>
      <div className={lateFollow ? "font-semibold text-rose-700" : ""}><dt className="inline">Sonraki takip: </dt><dd className="inline">{formatDate(nextFollowUpAt)}</dd></div>
    </dl>
  );
}

function WarningText({ text }: { text: string }) {
  return <p className="mt-3 flex items-center gap-1 rounded-md bg-rose-50 p-2 text-xs font-semibold text-rose-700"><AlertTriangle className="size-3.5" />{text}</p>;
}

function PlannedFollowUp() {
  return <p className="mt-2 flex items-center gap-1 text-xs text-[#65705f]"><CalendarClock className="size-3.5" />Takip planlandı</p>;
}

function Filter({ value, set, items, label }: { value: string; set: (value: string) => void; items: string[]; label: string }) {
  return (
    <select aria-label={label} value={value} onChange={(event) => set(event.target.value)} className="h-10 rounded-lg border bg-white px-3 text-sm">
      <option>{ALL}</option>
      {items.map((item) => <option key={item}>{item}</option>)}
    </select>
  );
}

function setDragData(event: React.DragEvent<HTMLElement>, itemType: "candidate" | "lead", itemId: string) {
  event.dataTransfer.setData("itemType", itemType);
  event.dataTransfer.setData("itemId", itemId);
}

function isLeadStageAllowed(stage: string): stage is (typeof LEAD_PIPELINE_STAGES)[number] {
  return (LEAD_PIPELINE_STAGES as readonly string[]).includes(stage);
}

function scoreTone(value: number | null) {
  if (!value) return "bg-[#eef2ea] text-[#65705f]";
  if (value >= 8) return "bg-emerald-100 text-emerald-800";
  if (value >= 5) return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}
