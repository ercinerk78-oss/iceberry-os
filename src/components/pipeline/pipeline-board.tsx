"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, MapPin, Search, Star } from "lucide-react";

import { moveCandidate } from "@/app/pipeline/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/candidates";
import { isOpenTask, PIPELINE_STAGES } from "@/lib/pipeline";
import type { Candidate } from "@/types/candidate";

const ALL = "Tümü";

export function PipelineBoard({ candidates: initial }: { candidates: Candidate[] }) {
  const [candidates, setCandidates] = useState(initial);
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

  const options = (key: keyof Candidate) => Array.from(new Set(initial.map((candidate) => String(candidate[key])).filter(Boolean))).sort((a, b) => a.localeCompare(b, "tr"));
  const conceptOptions = Array.from(new Set(initial.flatMap((candidate) => [candidate.interestedConcept, ...candidate.concepts.map((item) => item.name)]).filter(Boolean))).sort((a, b) => a.localeCompare(b, "tr"));

  const filtered = useMemo(() => {
    const query = q.toLocaleLowerCase("tr");

    return candidates.filter((candidate) => {
      const text = [
        candidate.fullName,
        candidate.phone,
        candidate.city,
        candidate.email,
        candidate.generalNotes,
        candidate.interestedConcept,
        ...candidate.concepts.map((item) => item.name),
        ...candidate.tags.map((tag) => tag.name),
        ...candidate.interactions.flatMap((interaction) => [interaction.title, interaction.description, interaction.nextAction]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr");
      const now = new Date();
      const next = candidate.nextFollowUpAt ? new Date(candidate.nextFollowUpAt) : null;
      const isLate = !!next && next < now;
      const today = next && next.toDateString() === now.toDateString();
      const week = next && next >= now && next.getTime() <= now.getTime() + 7 * 86400000;

      return (
        (!query || text.includes(query)) &&
        (city === ALL || candidate.city === city) &&
        (concept === ALL || candidate.interestedConcept === concept || candidate.concepts.some((item) => item.name === concept)) &&
        (temperature === ALL || candidate.temperature === temperature) &&
        (source === ALL || candidate.source === source) &&
        (owner === ALL || candidate.assignedUserId === owner) &&
        (budget === ALL || candidate.investmentBudget === budget) &&
        (!overdue || isLate) &&
        (!hot || ["Sıcak", "Çok Sıcak"].includes(candidate.temperature) || (candidate.qualificationScore ?? 0) >= 8) &&
        (follow === ALL || (follow === "Bugün" && today) || (follow === "7 Gün" && week) || (follow === "Gecikmiş" && isLate))
      );
    });
  }, [budget, candidates, city, concept, follow, hot, overdue, owner, q, source, temperature]);

  function drop(id: string, status: string) {
    const before = candidates;
    setCandidates((current) => current.map((candidate) => candidate.id === id ? { ...candidate, status } : candidate));
    startTransition(async () => {
      const result = await moveCandidate(id, status);
      setMessage({ ok: result.success, text: result.message });
      if (!result.success) setCandidates(before);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#dfe4dc] bg-white p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="flex h-10 items-center gap-2 rounded-lg border bg-[#f8faf6] px-3 xl:col-span-2">
            <Search className="size-4" />
            <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Ad, telefon, not, etiket veya konsept ara" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
          <Filter value={city} set={setCity} items={options("city")} label="Şehir" />
          <Filter value={concept} set={setConcept} items={conceptOptions} label="Konsept" />
          <Filter value={temperature} set={setTemperature} items={options("temperature")} label="Sıcaklık" />
          <Filter value={source} set={setSource} items={options("source")} label="Lead kaynağı" />
          <Filter value={owner} set={setOwner} items={options("assignedUserId")} label="Sorumlu" />
          <Filter value={budget} set={setBudget} items={options("investmentBudget")} label="Bütçe" />
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
          <section key={stage} onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event.dataTransfer.getData("candidateId"), stage)} className="min-h-[420px] w-[310px] shrink-0 rounded-lg border border-[#dfe4dc] bg-[#eef1eb] p-3">
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{stage}</h2>
              <Badge variant="secondary">{filtered.filter((candidate) => candidate.status === stage).length}</Badge>
            </header>
            <div className="space-y-3">
              {filtered.filter((candidate) => candidate.status === stage).map((candidate) => <PipelineCard key={candidate.id} candidate={candidate} onMove={drop} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function PipelineCard({ candidate, onMove }: { candidate: Candidate; onMove: (id: string, status: string) => void }) {
  const overdueTask = candidate.tasks.some((task) => isOpenTask(task.status) && new Date(task.dueDate) < new Date());
  const lateFollow = !!candidate.nextFollowUpAt && new Date(candidate.nextFollowUpAt) < new Date();
  const concepts = candidate.concepts.length ? candidate.concepts.map((item) => item.name).join(", ") : candidate.interestedConcept;

  return (
    <article draggable onDragStart={(event) => event.dataTransfer.setData("candidateId", candidate.id)} className="cursor-grab rounded-lg border border-[#dfe4dc] bg-white p-4 shadow-sm active:cursor-grabbing">
      <Link href={`/candidates/${candidate.id}`} className="font-semibold hover:underline">{candidate.fullName}</Link>
      <p className="mt-1 flex items-center gap-1 text-xs text-[#65705f]"><MapPin className="size-3" />{candidate.city} · {concepts}</p>
      <p className="mt-3 text-sm font-medium">{candidate.investmentBudget} {candidate.currency}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge className="bg-orange-100 text-orange-800">{candidate.temperature}</Badge>
        <Badge className={scoreTone(candidate.qualificationScore)}><Star className="mr-1 size-3" />{candidate.qualificationScore ? `${candidate.qualificationScore}/10` : "Puansız"}</Badge>
        <Badge variant="secondary">{candidate.source}</Badge>
      </div>
      {candidate.tags.length ? <div className="mt-2 flex flex-wrap gap-1">{candidate.tags.slice(0, 3).map((tag) => <Badge key={tag.id || tag.name} variant="secondary" className="text-[11px]">{tag.name}</Badge>)}</div> : null}
      <dl className="mt-3 grid gap-1 text-xs text-[#65705f]">
        <div><dt className="inline font-medium">Sorumlu: </dt><dd className="inline">{candidate.assignedUserId || "Atanmadı"}</dd></div>
        <div><dt className="inline font-medium">Son görüşme: </dt><dd className="inline">{formatDate(candidate.lastContactAt)}</dd></div>
        <div className={lateFollow ? "font-semibold text-rose-700" : ""}><dt className="inline">Sonraki takip: </dt><dd className="inline">{formatDate(candidate.nextFollowUpAt)}</dd></div>
      </dl>
      {(overdueTask || lateFollow) ? <p className="mt-3 flex items-center gap-1 rounded-md bg-rose-50 p-2 text-xs font-semibold text-rose-700"><AlertTriangle className="size-3.5" />{overdueTask ? "Gecikmiş görev" : "Gecikmiş takip"}</p> : null}
      {!lateFollow && candidate.nextFollowUpAt ? <p className="mt-2 flex items-center gap-1 text-xs text-[#65705f]"><CalendarClock className="size-3.5" />Takip planlandı</p> : null}
      <select aria-label={`${candidate.fullName} aşamasını değiştir`} value={candidate.status} onChange={(event) => onMove(candidate.id, event.target.value)} onPointerDown={(event) => event.stopPropagation()} className="mt-3 h-8 w-full rounded-md border border-[#d3d9cf] bg-white px-2 text-xs">
        {PIPELINE_STAGES.map((stage) => <option key={stage}>{stage}</option>)}
      </select>
    </article>
  );
}

function Filter({ value, set, items, label }: { value: string; set: (value: string) => void; items: string[]; label: string }) {
  return <select aria-label={label} value={value} onChange={(event) => set(event.target.value)} className="h-10 rounded-lg border bg-white px-3 text-sm"><option>{ALL}</option>{items.map((item) => <option key={item}>{item}</option>)}</select>;
}

function scoreTone(value: number | null) {
  if (!value) return "bg-[#eef2ea] text-[#65705f]";
  if (value >= 8) return "bg-emerald-100 text-emerald-800";
  if (value >= 5) return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}
