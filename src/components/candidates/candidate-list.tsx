"use client";

import type React from "react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, Filter, Plus, Search, Star, X } from "lucide-react";

import { createCandidate } from "@/app/candidates/actions";
import { CandidateForm } from "@/components/candidates/candidate-form";
import { LeadDetail } from "@/components/leads/lead-detail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/candidates";
import { LEAD_CATEGORIES, LEAD_CATEGORY_LABELS, LEAD_SOURCES, leadCategoryLabel, leadStatusLabel, statusValuesForFilter, type LeadView } from "@/lib/leads";
import { relativeTime } from "@/lib/qualification";
import type { Candidate } from "@/types/candidate";

const ALL = "Tümü";

type CandidateListProps = {
  candidates: Candidate[];
  leads?: LeadView[];
  conceptOptions?: string[];
  tagOptions?: string[];
  availableLocations?: { id: string; name: string; city: string; district: string | null }[];
  initialQuery?: string;
  initialLeadId?: string;
  initialStatus?: string;
  initialCategory?: string;
  initialFollowUp?: string;
  referenceNow?: number;
};

type UnifiedRow =
  | { type: "candidate"; id: string; date: string; candidate: Candidate; lead?: never }
  | { type: "lead"; id: string; date: string; lead: LeadView; candidate?: never };

export function CandidateList({
  candidates,
  leads = [],
  conceptOptions = [],
  tagOptions = [],
  availableLocations = [],
  initialQuery = "",
  initialLeadId,
  initialStatus,
  initialCategory,
  initialFollowUp,
  referenceNow,
}: CandidateListProps) {
  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState(ALL);
  const [status, setStatus] = useState(initialStatus || ALL);
  const [source, setSource] = useState(ALL);
  const [category, setCategory] = useState(initialCategory || ALL);
  const [followUp, setFollowUp] = useState(initialFollowUp || ALL);
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [temperature, setTemperature] = useState(ALL);
  const [score, setScore] = useState(ALL);
  const [sort, setSort] = useState("Güncel");
  const [open, setOpen] = useState(false);
  const effectiveReferenceNow = referenceNow ?? 0;

  const rows = useMemo<UnifiedRow[]>(() => {
    const candidateRows = candidates.map((candidate) => ({
      type: "candidate" as const,
      id: `candidate:${candidate.id}`,
      date: candidate.updatedAt || candidate.createdAt,
      candidate,
    }));
    const leadRows = leads.map((lead) => ({
      type: "lead" as const,
      id: `lead:${lead.id}`,
      date: lead.leadDate,
      lead,
    }));

    return [...leadRows, ...candidateRows];
  }, [candidates, leads]);
  const [selectedLead, setSelectedLead] = useState<LeadView | null>(() => {
    if (!initialLeadId) return null;
    const lead = leads.find((item) => item.id === initialLeadId);

    return lead ?? null;
  });

  const values = (items: string[]) => Array.from(new Set(items.filter(Boolean))).sort((a, b) => a.localeCompare(b, "tr"));
  const cityOptions = values([...candidates.map((candidate) => candidate.city), ...leads.map((lead) => lead.city)]);
  const statusOptions = values([
    ...candidates.map((candidate) => candidate.status),
    ...leads.flatMap((lead) => [lead.processStatus || lead.status, lead.status]),
  ]);
  const sourceOptions = values([...LEAD_SOURCES, ...candidates.map((candidate) => candidate.source), ...leads.map((lead) => lead.source)]);
  const temperatureOptions = values(candidates.map((candidate) => candidate.temperature));
  const conceptFilterOptions = values([
    ...conceptOptions,
    ...candidates.flatMap((candidate) => candidate.concepts.map((item) => item.name)),
    ...candidates.map((candidate) => candidate.interestedConcept),
    ...leads.flatMap((lead) => lead.concepts.map((item) => item.name)),
    ...leads.map((lead) => lead.requestedConcept),
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    const statusValues = status === ALL ? [] : statusValuesForFilter(status);
    const filteredRows = rows.filter((row) => {
      const item = row.type === "candidate" ? row.candidate : row.lead;
      const task = row.type === "candidate" ? nextOpenTask(row.candidate) : nextLeadTask(row.lead);
      const concepts = row.type === "candidate" ? row.candidate.concepts.map((concept) => concept.name) : row.lead.concepts.map((concept) => concept.name);
      const primaryConcept = row.type === "candidate" ? row.candidate.interestedConcept : row.lead.requestedConcept;
      const rowStatus = row.type === "candidate" ? row.candidate.status : row.lead.processStatus || row.lead.status;
      const rowSource = row.type === "candidate" ? row.candidate.source : row.lead.source;
      const rowCategory = row.type === "lead" ? row.lead.leadCategory : "";
      const rowTemperature = row.type === "candidate" ? row.candidate.temperature : "";
      const rowScore = row.type === "candidate" ? row.candidate.qualificationScore : null;
      const rowTags = row.type === "candidate" ? row.candidate.tags.map((tag) => tag.name) : [];
      const nextFollowUpAt = row.type === "candidate" ? row.candidate.nextFollowUpAt : row.lead.nextFollowUpAt;
      const text = [
        item.fullName,
        item.phone,
        item.email,
        item.city,
        row.type === "candidate" ? row.candidate.district : "",
        row.type === "candidate" ? row.candidate.investmentBudget : row.lead.investmentBudget,
        primaryConcept,
        row.type === "candidate" ? row.candidate.generalNotes : row.lead.description,
        ...concepts,
        ...rowTags,
        ...(row.type === "candidate"
          ? row.candidate.interactions.flatMap((interaction) => [interaction.title, interaction.description, interaction.nextAction])
          : row.lead.activities.map((activity) => activity.description)),
        task?.title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr");

      return (
        (!q || text.includes(q)) &&
        (city === ALL || item.city === city) &&
        (status === ALL || rowStatus === status || statusValues.includes(rowStatus)) &&
        (source === ALL || rowSource === source) &&
        (category === ALL || rowCategory === category) &&
        (followUp !== "overdue" || (!!nextFollowUpAt && new Date(nextFollowUpAt).getTime() < effectiveReferenceNow)) &&
        (!selectedConcepts.length || selectedConcepts.some((concept) => concepts.includes(concept) || primaryConcept === concept)) &&
        (!selectedTags.length || selectedTags.some((tag) => rowTags.includes(tag))) &&
        (temperature === ALL || rowTemperature === temperature) &&
        matchesScore(rowScore, score)
      );
    });

    return filteredRows.sort((a, b) => {
      if (sort === "Puan yüksek") return rowScore(b) - rowScore(a);
      if (sort === "Puan düşük") return emptyLastScore(a) - emptyLastScore(b);
      if (sort === "Takip yakın") return dateValue(rowFollowUp(a)) - dateValue(rowFollowUp(b));
      return dateValue(b.date) - dateValue(a.date);
    });
  }, [category, city, effectiveReferenceNow, followUp, query, rows, score, selectedConcepts, selectedTags, sort, source, status, temperature]);

  const reset = () => {
    setQuery("");
    setCity(ALL);
    setStatus(ALL);
    setSource(ALL);
    setCategory(ALL);
    setFollowUp(ALL);
    setSelectedConcepts([]);
    setSelectedTags([]);
    setTemperature(ALL);
    setScore(ALL);
    setSort("Güncel");
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-lg border-[#dfe4dc] bg-white shadow-none">
        <CardHeader>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>Franchise Adayları</CardTitle>
              <p className="mt-1 text-sm text-[#65705f]">
                {filtered.length} kayıt gösteriliyor. {candidates.length} aktif aday, {leads.length} yeni lead tek ekranda yönetiliyor.
              </p>
            </div>
            <Button onClick={() => setOpen(true)} className="bg-[#17201b] text-white">
              <Plus className="size-4" />
              Yeni Aday Ekle
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-[1.3fr_repeat(5,0.8fr)_auto]">
            <label className="flex h-11 items-center gap-2 rounded-lg border border-[#d3d9cf] bg-[#f8faf6] px-3">
              <Search className="size-4" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="İsim, not, etiket, konsept veya telefon ara" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>
            <Select value={city} set={setCity} items={cityOptions} label="Şehir" />
            <Select value={status} set={setStatus} items={statusOptions} label="Durum" />
            <Select value={source} set={setSource} items={sourceOptions} label="Kaynak" />
            <Select value={category} set={setCategory} items={LEAD_CATEGORIES.map((item) => item)} labels={LEAD_CATEGORY_LABELS} label="Kategori" />
            <Select value={score} set={setScore} items={["1-3", "4-6", "7-8", "9-10", "Puansız"]} label="Puan" />
            <Select value={sort} set={setSort} items={["Güncel", "Puan yüksek", "Puan düşük", "Takip yakın"]} label="Sıralama" includeAll={false} />
            <Button variant="outline" onClick={reset}>
              <Filter className="size-4" />
              Sıfırla
            </Button>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <MultiFilter title="Konsept filtresi" items={conceptFilterOptions} selected={selectedConcepts} setSelected={setSelectedConcepts} />
            <MultiFilter title="Etiket filtresi" items={values([...tagOptions, ...candidates.flatMap((candidate) => candidate.tags.map((tag) => tag.name))])} selected={selectedTags} setSelected={setSelectedTags} />
            <Select value={temperature} set={setTemperature} items={temperatureOptions} label="Sıcaklık" />
          </div>
          <div className="overflow-x-auto rounded-lg border border-[#dfe4dc]">
            <table className="w-full min-w-[1260px] text-left text-sm">
              <thead className="bg-[#f6f7f4] text-xs uppercase text-[#65705f]">
                <tr>
                  {["Kayıt", "Telefon", "Şehir", "Bütçe", "Konseptler", "Puan", "Durum", "Son Temas", "Sıradaki Aksiyon"].map((header) => (
                    <th key={header} className="px-4 py-3">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0e9]">
                {filtered.map((row) => (
                  <UnifiedTableRow key={row.id} row={row} onOpenLead={(lead) => setSelectedLead(lead)} />
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? <p className="p-8 text-center text-sm text-[#65705f]">Filtrelere uygun aday veya lead bulunamadı.</p> : null}
          </div>
        </CardContent>
      </Card>

      {open ? (
        <Modal title="Yeni Aday Ekle" description="Franchise adayını kalıcı olarak kaydet." onClose={() => setOpen(false)}>
          <CandidateForm action={createCandidate} conceptOptions={conceptFilterOptions} tagOptions={tagOptions} onCancel={() => setOpen(false)} onSuccess={() => setOpen(false)} />
        </Modal>
      ) : null}

      {selectedLead ? (
        <Modal title={`${selectedLead.fullName} - Lead Detayı`} description="Lead detayını aynı aday çalışma ekranında yönet." onClose={() => setSelectedLead(null)}>
          <LeadDetail lead={selectedLead} availableLocations={availableLocations} />
        </Modal>
      ) : null}
    </div>
  );
}

function UnifiedTableRow({ row, onOpenLead }: { row: UnifiedRow; onOpenLead: (lead: LeadView) => void }) {
  const isLead = row.type === "lead";
  const item = isLead ? row.lead : row.candidate;
  const task = isLead ? nextLeadTask(row.lead) : nextOpenTask(row.candidate);
  const latestContact = isLead ? latestLeadContactText(row.lead) : latestCandidateContactText(row.candidate);
  const concepts = isLead
    ? row.lead.concepts.length ? row.lead.concepts : [{ id: row.lead.requestedConcept, name: row.lead.requestedConcept, code: row.lead.requestedConcept }]
    : row.candidate.concepts.length ? row.candidate.concepts : [{ id: row.candidate.interestedConcept, name: row.candidate.interestedConcept, code: row.candidate.interestedConcept }];
  const score = isLead ? null : row.candidate.qualificationScore;

  return (
    <tr className="hover:bg-[#fbfcf9]">
      <td className="px-4 py-4">
        {isLead ? (
          <button type="button" onClick={() => onOpenLead(row.lead)} className="text-left font-semibold hover:underline">
            {item.fullName}
          </button>
        ) : (
          <Link href={`/candidates/${row.candidate.id}`} className="font-semibold hover:underline">
            {item.fullName}
          </Link>
        )}
        <div className="mt-1 flex flex-wrap gap-1">
          <Badge className={isLead ? "bg-sky-100 text-sky-800" : "bg-emerald-100 text-emerald-800"}>{isLead ? "Lead" : "Aday"}</Badge>
          <span className="text-xs text-[#65705f]">{item.source}</span>
          {!isLead ? row.candidate.tags.slice(0, 3).map((tag) => <Badge key={tag.id || tag.name} variant="secondary" className="text-[11px]">{tag.name}</Badge>) : null}
        </div>
      </td>
      <td className="px-4">{item.phone}<div className="text-xs text-[#65705f]">{item.email || "E-posta yok"}</div></td>
      <td className="px-4">{item.city}<div className="text-xs text-[#65705f]">{!isLead ? row.candidate.district : ""}</div></td>
      <td className="px-4">{isLead ? row.lead.investmentBudget || "Belirtilmedi" : `${row.candidate.investmentBudget} ${row.candidate.currency}`}</td>
      <td className="px-4">
        <div className="flex flex-wrap gap-1">
          {concepts.map((concept) => <Badge key={concept.id || concept.name} variant="secondary">{concept.name}</Badge>)}
        </div>
      </td>
      <td className="px-4">
        <Badge className={scoreTone(score)}>
          <Star className="mr-1 size-3" />
          {score ? `${score}/10` : "Puansız"}
        </Badge>
      </td>
      <td className="px-4">
        <Badge className="bg-[#ecfbdc] text-[#2f5f20]">{isLead ? leadStatusLabel(row.lead.processStatus || row.lead.status) : row.candidate.status}</Badge>
        <div className="mt-1">{isLead ? <Badge variant="secondary">{leadCategoryLabel(row.lead.leadCategory)}</Badge> : <Badge className="bg-rose-100 text-rose-800">{row.candidate.temperature}</Badge>}</div>
      </td>
      <td className="px-4">{latestContact}</td>
      <td className="px-4">
        {task ? (
          isLead ? (
            <button type="button" onClick={() => onOpenLead(row.lead)} className="inline-flex items-center gap-1 text-sm font-medium text-[#17201b] hover:underline">
              <CalendarClock className="size-4" />
              {task.title}
            </button>
          ) : (
            <Link href={`/candidates/${row.candidate.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-[#17201b] hover:underline">
              <CalendarClock className="size-4" />
              {task.title}
            </Link>
          )
        ) : (
          <span className="text-[#65705f]">Planlı aksiyon yok</span>
        )}
        <div className="text-xs text-[#65705f]">{task ? formatDate(task.dueDate) : formatDate(isLead ? row.lead.nextFollowUpAt : row.candidate.nextFollowUpAt)}</div>
      </td>
    </tr>
  );
}

function Select({ value, set, items, label, includeAll = true, labels }: { value: string; set: (value: string) => void; items: string[]; label: string; includeAll?: boolean; labels?: Partial<Record<string, string>> }) {
  return (
    <select aria-label={label} value={value} onChange={(event) => set(event.target.value)} className="h-11 rounded-lg border border-[#d3d9cf] bg-white px-3 text-sm">
      {includeAll ? <option>{ALL}</option> : null}
      {items.map((item) => <option key={item} value={item}>{labels?.[item] ?? item}</option>)}
    </select>
  );
}

function matchesScore(value: number | null, filter: string) {
  if (filter === ALL) return true;
  if (filter === "Puansız") return value == null;
  if (!value) return false;
  if (filter === "1-3") return value >= 1 && value <= 3;
  if (filter === "4-6") return value >= 4 && value <= 6;
  if (filter === "7-8") return value >= 7 && value <= 8;
  return value >= 9 && value <= 10;
}

function scoreTone(value: number | null) {
  if (!value) return "bg-[#eef2ea] text-[#65705f]";
  if (value >= 8) return "bg-emerald-100 text-emerald-800";
  if (value >= 5) return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

function latestCandidateContactText(candidate: Candidate) {
  const latestInteraction = candidate.interactions[0];
  if (latestInteraction) return `${latestInteraction.interactionType} - ${relativeTime(latestInteraction.interactionDate)}`;
  if (!candidate.lastContactAt) return "Henüz görüşme yok";
  return formatDate(candidate.lastContactAt);
}

function latestLeadContactText(lead: LeadView) {
  const latestActivity = lead.activities[0];
  if (latestActivity) return `${latestActivity.type} - ${relativeTime(latestActivity.createdAt)}`;
  if (!lead.lastContactAt) return "Henüz görüşme yok";
  return formatDate(lead.lastContactAt);
}

function nextOpenTask(candidate: Candidate) {
  return candidate.tasks.find((task) => !task.completedAt && !["Tamamlandı", "İptal"].includes(task.status));
}

function nextLeadTask(lead: LeadView) {
  return lead.tasks?.find((task) => !task.completedAt && !["Tamamlandı", "İptal"].includes(task.status));
}

function rowScore(row: UnifiedRow) {
  return row.type === "candidate" ? row.candidate.qualificationScore ?? 0 : 0;
}

function emptyLastScore(row: UnifiedRow) {
  return row.type === "candidate" ? row.candidate.qualificationScore ?? 99 : 99;
}

function rowFollowUp(row: UnifiedRow) {
  return row.type === "candidate" ? row.candidate.nextFollowUpAt : row.lead.nextFollowUpAt;
}

function dateValue(value?: string) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

function MultiFilter({ title, items, selected, setSelected }: { title: string; items: string[]; selected: string[]; setSelected: (value: string[]) => void }) {
  if (!items.length) return <div className="rounded-lg border border-dashed border-[#d3d9cf] p-3 text-sm text-[#65705f]">{title}: seçenek yok</div>;

  return (
    <fieldset className="rounded-lg border border-[#d3d9cf] bg-[#f8faf6] p-3">
      <legend className="px-1 text-sm font-medium">{title}</legend>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active = selected.includes(item);

          return (
            <button
              key={item}
              type="button"
              onClick={() => setSelected(active ? selected.filter((value) => value !== item) : [...selected, item])}
              className={`rounded-md border px-3 py-1 text-xs font-medium ${active ? "border-[#17201b] bg-[#17201b] text-white" : "border-[#d3d9cf] bg-white text-[#364036]"}`}
            >
              {item}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function Modal({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[#17201b]/40 p-3 backdrop-blur-sm md:items-center md:justify-center">
      <div className="max-h-[92vh] w-full overflow-auto rounded-lg bg-white md:max-w-5xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-[#65705f]">{description}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="size-4" /></Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
