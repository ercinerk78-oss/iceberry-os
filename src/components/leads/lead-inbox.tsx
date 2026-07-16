"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, Mail, MapPin, Phone, Plus, Search, X } from "lucide-react";

import { LeadForm } from "@/components/leads/lead-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/candidates";
import {
  LEAD_CATEGORIES,
  LEAD_CATEGORY_LABELS,
  LEAD_SOURCES,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  leadCategoryLabel,
  leadStatusLabel,
  statusValuesForFilter,
  type LeadView,
} from "@/lib/leads";

const ALL = "Tümü";

type LeadInboxProps = {
  leads: LeadView[];
  initialStatus?: string;
  initialCategory?: string;
  initialFollowUp?: string;
};

export function LeadInbox({ leads, initialStatus, initialCategory, initialFollowUp }: LeadInboxProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(initialStatus || ALL);
  const [source, setSource] = useState(ALL);
  const [category, setCategory] = useState(initialCategory || ALL);
  const [followUp, setFollowUp] = useState(initialFollowUp || ALL);
  const [now] = useState(() => Date.now());
  const filtered = useMemo(() => {
    const statusValues = status === ALL ? [] : statusValuesForFilter(status);

    return leads.filter((lead) => {
      const matchesQuery =
        !q ||
        `${lead.fullName} ${lead.phone} ${lead.email} ${lead.city}`
          .toLocaleLowerCase("tr")
          .includes(q.toLocaleLowerCase("tr"));
      const matchesStatus = status === ALL || statusValues.includes(lead.status);
      const matchesSource = source === ALL || lead.source === source;
      const matchesCategory = category === ALL || lead.leadCategory === category;
      const overdue =
        followUp !== "overdue" ||
        (!!lead.nextFollowUpAt && new Date(lead.nextFollowUpAt).getTime() < now);

      return matchesQuery && matchesStatus && matchesSource && matchesCategory && overdue;
    });
  }, [category, followUp, leads, now, q, source, status]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#dfe4dc] bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold">Lead Havuzu</h2>
            <p className="mt-1 text-sm text-[#65705f]">
              {filtered.length} lead gösteriliyor, toplam {leads.length} kayıt var.
            </p>
          </div>
          <Button onClick={() => setOpen(true)} className="bg-[#17201b] text-white">
            <Plus className="size-4" />
            Yeni Lead Ekle
          </Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="flex h-10 items-center gap-2 rounded-lg border bg-[#f8faf6] px-3 xl:col-span-2">
            <Search className="size-4" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="İsim, telefon veya şehir ara"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <select aria-label="Durum" value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-lg border px-3 text-sm">
            <option>{ALL}</option>
            {LEAD_STATUSES.map((item) => (
              <option key={item} value={item}>
                {LEAD_STATUS_LABELS[item]}
              </option>
            ))}
          </select>
          <select aria-label="Kaynak" value={source} onChange={(event) => setSource(event.target.value)} className="h-10 rounded-lg border px-3 text-sm">
            <option>{ALL}</option>
            {LEAD_SOURCES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select aria-label="Kategori" value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-lg border px-3 text-sm">
            <option>{ALL}</option>
            {LEAD_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {LEAD_CATEGORY_LABELS[item]}
              </option>
            ))}
          </select>
          <select aria-label="Takip" value={followUp} onChange={(event) => setFollowUp(event.target.value)} className="h-10 rounded-lg border px-3 text-sm">
            <option>{ALL}</option>
            <option value="overdue">Geciken takipler</option>
          </select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((lead) => (
          <Link
            href={`/leads/${lead.id}`}
            key={lead.id}
            className="rounded-lg border border-[#dfe4dc] bg-white p-5 shadow-none transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{lead.fullName}</h3>
                <p className="mt-1 flex items-center gap-1 text-sm text-[#65705f]">
                  <MapPin className="size-4" />
                  {lead.city}
                </p>
              </div>
              <Badge className={lead.status === "NEW" || lead.status === "Yeni" ? "bg-sky-100 text-sky-700" : "bg-[#eef2ea] text-[#364036]"}>
                {leadStatusLabel(lead.status)}
              </Badge>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-[#65705f]">
              <span className="flex items-center gap-2">
                <Phone className="size-4" />
                {lead.phone}
              </span>
              <span className="flex items-center gap-2">
                <Mail className="size-4" />
                {lead.email || "—"}
              </span>
              {lead.nextFollowUpAt ? (
                <span className="flex items-center gap-2">
                  <CalendarClock className="size-4" />
                  {formatDate(lead.nextFollowUpAt)}
                </span>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="secondary">{lead.source}</Badge>
              <Badge variant="secondary">{lead.requestedConcept}</Badge>
              {lead.leadCategory ? <Badge variant="secondary">{leadCategoryLabel(lead.leadCategory)}</Badge> : null}
            </div>
            <p className="mt-4 text-xs text-[#65705f]">Lead tarihi: {formatDate(lead.leadDate)}</p>
          </Link>
        ))}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-[#17201b]/40 p-3 md:items-center md:justify-center">
          <div className="max-h-[92vh] w-full overflow-auto rounded-lg bg-white md:max-w-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold">Yeni Lead Ekle</h3>
                <p className="text-sm text-[#65705f]">Manuel lead kaydı oluştur.</p>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <LeadForm onCancel={() => setOpen(false)} onSuccess={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
