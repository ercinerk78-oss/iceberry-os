"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, Filter, Plus, Search, Star, X } from "lucide-react";

import { createCandidate } from "@/app/candidates/actions";
import { CandidateForm } from "@/components/candidates/candidate-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/candidates";
import { relativeTime } from "@/lib/qualification";
import type { Candidate } from "@/types/candidate";

const ALL = "Tümü";

type CandidateListProps = {
  candidates: Candidate[];
  conceptOptions?: string[];
  tagOptions?: string[];
  initialQuery?: string;
};

export function CandidateList({ candidates, conceptOptions = [], tagOptions = [], initialQuery = "" }: CandidateListProps) {
  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [temperature, setTemperature] = useState(ALL);
  const [score, setScore] = useState(ALL);
  const [sort, setSort] = useState("Güncel");
  const [open, setOpen] = useState(false);

  const values = (items: string[]) => Array.from(new Set(items.filter(Boolean))).sort((a, b) => a.localeCompare(b, "tr"));
  const cityOptions = values(candidates.map((candidate) => candidate.city));
  const statusOptions = values(candidates.map((candidate) => candidate.status));
  const temperatureOptions = values(candidates.map((candidate) => candidate.temperature));
  const conceptFilterOptions = values([...conceptOptions, ...candidates.flatMap((candidate) => candidate.concepts.map((item) => item.name)), ...candidates.map((candidate) => candidate.interestedConcept)]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    const filteredCandidates = candidates.filter((candidate) => {
      const task = nextOpenTask(candidate);
      const text = [
        candidate.fullName,
        candidate.phone,
        candidate.email,
        candidate.city,
        candidate.district,
        candidate.investmentBudget,
        candidate.interestedConcept,
        candidate.generalNotes,
        ...candidate.concepts.map((item) => item.name),
        ...candidate.tags.map((tag) => tag.name),
        ...candidate.interactions.flatMap((interaction) => [interaction.title, interaction.description, interaction.nextAction]),
        task?.title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr");

      return (
        (!q || text.includes(q)) &&
        (city === ALL || candidate.city === city) &&
        (status === ALL || candidate.status === status) &&
        (!selectedConcepts.length || selectedConcepts.some((item) => candidate.concepts.some((conceptItem) => conceptItem.name === item) || candidate.interestedConcept === item)) &&
        (!selectedTags.length || selectedTags.some((item) => candidate.tags.some((tag) => tag.name === item))) &&
        (temperature === ALL || candidate.temperature === temperature) &&
        matchesScore(candidate.qualificationScore, score)
      );
    });

    return filteredCandidates.sort((a, b) => {
      if (sort === "Puan yüksek") return (b.qualificationScore ?? 0) - (a.qualificationScore ?? 0);
      if (sort === "Puan düşük") return (a.qualificationScore ?? 99) - (b.qualificationScore ?? 99);
      if (sort === "Takip yakın") return dateValue(a.nextFollowUpAt) - dateValue(b.nextFollowUpAt);
      return dateValue(b.updatedAt) - dateValue(a.updatedAt);
    });
  }, [candidates, city, query, score, selectedConcepts, selectedTags, sort, status, temperature]);

  const reset = () => {
    setQuery("");
    setCity(ALL);
    setStatus(ALL);
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
              <p className="mt-1 text-sm text-[#65705f]">{filtered.length} aday listeleniyor, toplam {candidates.length} aktif kayıt var.</p>
            </div>
            <Button onClick={() => setOpen(true)} className="bg-[#17201b] text-white">
              <Plus className="size-4" />
              Yeni Aday Ekle
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-[1.3fr_repeat(4,0.8fr)_auto]">
            <label className="flex h-11 items-center gap-2 rounded-lg border border-[#d3d9cf] bg-[#f8faf6] px-3">
              <Search className="size-4" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="İsim, not, etiket, konsept veya telefon ara" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>
            <Select value={city} set={setCity} items={cityOptions} label="Şehir" />
            <Select value={status} set={setStatus} items={statusOptions} label="Durum" />
            <Select value={temperature} set={setTemperature} items={temperatureOptions} label="Sıcaklık" />
            <Select value={score} set={setScore} items={["1-3", "4-6", "7-8", "9-10", "Puansız"]} label="Puan" />
            <Select value={sort} set={setSort} items={["Güncel", "Puan yüksek", "Puan düşük", "Takip yakın"]} label="Sıralama" includeAll={false} />
            <Button variant="outline" onClick={reset}>
              <Filter className="size-4" />
              Sıfırla
            </Button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <MultiFilter title="Konsept filtresi" items={conceptFilterOptions} selected={selectedConcepts} setSelected={setSelectedConcepts} />
            <MultiFilter title="Etiket filtresi" items={values([...tagOptions, ...candidates.flatMap((candidate) => candidate.tags.map((tag) => tag.name))])} selected={selectedTags} setSelected={setSelectedTags} />
          </div>
          <div className="overflow-x-auto rounded-lg border border-[#dfe4dc]">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-[#f6f7f4] text-xs uppercase text-[#65705f]">
                <tr>
                  {["Ad Soyad", "Telefon", "Şehir", "Bütçe", "Konseptler", "Puan", "Durum", "Son Temas", "Sıradaki Aksiyon"].map((header) => (
                    <th key={header} className="px-4 py-3">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0e9]">
                {filtered.map((candidate) => {
                  const task = nextOpenTask(candidate);
                  const latestContact = latestContactText(candidate);

                  return (
                    <tr key={candidate.id} className="hover:bg-[#fbfcf9]">
                      <td className="px-4 py-4">
                        <Link href={`/candidates/${candidate.id}`} className="font-semibold hover:underline">{candidate.fullName}</Link>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="text-xs text-[#65705f]">{candidate.source}</span>
                          {candidate.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag.id || tag.name} variant="secondary" className="text-[11px]">{tag.name}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4">{candidate.phone}<div className="text-xs text-[#65705f]">{candidate.email || "E-posta yok"}</div></td>
                      <td className="px-4">{candidate.city}<div className="text-xs text-[#65705f]">{candidate.district}</div></td>
                      <td className="px-4">{candidate.investmentBudget} {candidate.currency}</td>
                      <td className="px-4">
                        <div className="flex flex-wrap gap-1">
                          {candidate.concepts.length ? candidate.concepts.map((item) => <Badge key={item.id || item.name} variant="secondary">{item.name}</Badge>) : <Badge variant="secondary">{candidate.interestedConcept}</Badge>}
                        </div>
                      </td>
                      <td className="px-4">
                        <Badge className={scoreTone(candidate.qualificationScore)}>
                          <Star className="mr-1 size-3" />
                          {candidate.qualificationScore ? `${candidate.qualificationScore}/10` : "Puansız"}
                        </Badge>
                      </td>
                      <td className="px-4"><Badge className="bg-[#ecfbdc] text-[#2f5f20]">{candidate.status}</Badge><div className="mt-1"><Badge className="bg-rose-100 text-rose-800">{candidate.temperature}</Badge></div></td>
                      <td className="px-4">{latestContact}</td>
                      <td className="px-4">
                        {task ? (
                          <Link href={`/candidates/${candidate.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-[#17201b] hover:underline">
                            <CalendarClock className="size-4" />
                            {task.title}
                          </Link>
                        ) : (
                          <span className="text-[#65705f]">Planlı aksiyon yok</span>
                        )}
                        <div className="text-xs text-[#65705f]">{task ? formatDate(task.dueDate) : formatDate(candidate.nextFollowUpAt)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 ? <p className="p-8 text-center text-sm text-[#65705f]">Filtrelere uygun aday bulunamadı.</p> : null}
          </div>
        </CardContent>
      </Card>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-[#17201b]/40 p-3 backdrop-blur-sm md:items-center md:justify-center">
          <div className="max-h-[92vh] w-full overflow-auto rounded-lg bg-white md:max-w-3xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold">Yeni Aday Ekle</h3>
                <p className="text-sm text-[#65705f]">Franchise adayını kalıcı olarak kaydet.</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setOpen(false)}><X className="size-4" /></Button>
            </div>
            <CandidateForm action={createCandidate} conceptOptions={conceptFilterOptions} tagOptions={tagOptions} onCancel={() => setOpen(false)} onSuccess={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Select({ value, set, items, label, includeAll = true }: { value: string; set: (value: string) => void; items: string[]; label: string; includeAll?: boolean }) {
  return (
    <select aria-label={label} value={value} onChange={(event) => set(event.target.value)} className="h-11 rounded-lg border border-[#d3d9cf] bg-white px-3 text-sm">
      {includeAll ? <option>{ALL}</option> : null}
      {items.map((item) => <option key={item}>{item}</option>)}
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

function latestContactText(candidate: Candidate) {
  const latestInteraction = candidate.interactions[0];
  if (latestInteraction) return `${latestInteraction.interactionType} · ${relativeTime(latestInteraction.interactionDate)}`;
  if (!candidate.lastContactAt) return "Henüz görüşme yok";
  return formatDate(candidate.lastContactAt);
}

function nextOpenTask(candidate: Candidate) {
  return candidate.tasks.find((task) => !task.completedAt && !["Tamamlandı", "İptal"].includes(task.status));
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
