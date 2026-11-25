"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { normalizeBranchSearch } from "@/lib/branch-search";
import { formatRevenueEntry, revenueEntryValue, REVENUE_MONTH_NAMES } from "@/lib/revenue-entry";

export function RevenueBranchSearch({ branches }: { branches: { id: string; branchName: string }[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const matches = query.trim() && !selected ? branches.filter(branch => normalizeBranchSearch(branch.branchName).includes(normalizeBranchSearch(query))) : [];
  function choose(branch: { id: string; branchName: string }) {
    setSelected(branch.id); setQuery(branch.branchName); setFocused(false);
    input.current?.setCustomValidity("");
  }
  return <div className="relative min-w-0 xl:col-span-2" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <label className="block text-sm font-medium">Şube
      <span className="mt-1 flex h-10 items-center gap-2 rounded-lg border px-3"><Search className="size-4 shrink-0" />
        <input ref={input} type="search" required autoComplete="off" aria-label="Şube ara" aria-controls={listId} placeholder="Şube adı yazın" value={query}
          onFocus={() => setFocused(true)} onChange={event => {
            setQuery(event.target.value); setSelected(""); setFocused(true);
            event.target.setCustomValidity("Arama sonuçlarından bir şube seçin.");
          }} onKeyDown={event => {
            if (event.key === "Escape") setFocused(false);
            if (event.key === "Enter" && !selected && matches.length) { event.preventDefault(); choose(matches[0]); }
          }} className="min-w-0 w-full bg-transparent text-sm outline-none" />
      </span>
    </label>
    <input type="hidden" name="branchId" value={selected} />
    {focused && query.trim() && !selected ? <div id={listId} className="absolute inset-x-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-lg border bg-white p-1 shadow-lg">
      {matches.map(branch => <button key={branch.id} type="button" onMouseDown={event => event.preventDefault()} onClick={() => choose(branch)} className="block min-h-10 w-full break-words rounded px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted">{branch.branchName}</button>)}
      {!matches.length ? <p className="p-3 text-sm text-muted-foreground">Şube bulunamadı.</p> : null}
    </div> : null}
  </div>;
}

export function RevenuePeriodPicker({ year, month }: { year: number; month: number }) {
  const [period, setPeriod] = useState({ year, month });
  const [visibleYear, setVisibleYear] = useState(year);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return <div ref={root} className="relative min-w-0" onKeyDown={event => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } }}>
    <span className="text-sm font-medium">Ciro Dönemi</span>
    <input type="hidden" name="year" value={period.year} /><input type="hidden" name="month" value={period.month} />
    <button ref={trigger} type="button" aria-label="Ciro dönemi" aria-expanded={open} onClick={() => { setVisibleYear(period.year); setOpen(!open); }} className="mt-1 flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 text-sm"><span>{REVENUE_MONTH_NAMES[period.month - 1]} {period.year}</span><CalendarDays className="size-4 shrink-0" /></button>
    {open ? <div className="absolute left-0 top-full z-30 mt-1 w-64 max-w-[calc(100vw-3rem)] rounded-lg border bg-white p-3 shadow-lg">
      <div className="mb-3 flex items-center justify-between"><button type="button" title="Önceki yıl" aria-label="Önceki yıl" disabled={visibleYear <= 2020} onClick={() => setVisibleYear(visibleYear - 1)} className="flex size-9 items-center justify-center rounded border disabled:opacity-40"><ChevronLeft className="size-4" /></button><strong>{visibleYear}</strong><button type="button" title="Sonraki yıl" aria-label="Sonraki yıl" disabled={visibleYear >= 2100} onClick={() => setVisibleYear(visibleYear + 1)} className="flex size-9 items-center justify-center rounded border disabled:opacity-40"><ChevronRight className="size-4" /></button></div>
      <div className="grid grid-cols-3 gap-1">{REVENUE_MONTH_NAMES.map((name, index) => <button key={name} type="button" aria-pressed={period.year === visibleYear && period.month === index + 1} onClick={() => { setPeriod({ year: visibleYear, month: index + 1 }); setOpen(false); trigger.current?.focus(); }} className={`min-h-10 rounded px-2 py-1 text-sm ${period.year === visibleYear && period.month === index + 1 ? "bg-emerald-100 font-semibold text-emerald-900" : "hover:bg-muted"}`}>{name}</button>)}</div>
    </div> : null}
  </div>;
}

export function RevenueAmountInput() {
  const [value, setValue] = useState("");
  return <label className="block min-w-0 text-sm font-medium xl:col-span-2">
    <span className="mb-1 block">Gerçekleşen ciro</span>
    <input aria-label="Gerçekleşen ciro" required type="text" inputMode="decimal" autoComplete="off" value={value} onChange={event => {
      const formatted = formatRevenueEntry(event.target.value);
      if (formatted !== null) {
        const input = event.target;
        const significant = input.value.slice(0, input.selectionStart ?? input.value.length).replace(/\./g, "").length;
        setValue(formatted);
        requestAnimationFrame(() => {
          let position = 0; let seen = 0;
          while (position < formatted.length && seen < significant) { if (formatted[position] !== ".") seen++; position++; }
          input.setSelectionRange(position, position);
        });
      }
    }} onBlur={() => { if (value.endsWith(",")) setValue(value.slice(0, -1)); }} className="h-10 min-w-0 w-full rounded-lg border px-3 font-normal tabular-nums" />
    <input type="hidden" name="grossRevenue" value={revenueEntryValue(value)} />
  </label>;
}
