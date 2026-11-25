"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { normalizeBranchSearch } from "@/lib/branch-search";

export function BranchSearchSelect({ branches, value, onChange, required, disabled }: { branches: { id: string; branchName: string }[]; value: string; onChange: (id: string) => void; required: boolean; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const filtered = branches.filter(branch => normalizeBranchSearch(branch.branchName).includes(normalizeBranchSearch(query)));
  const selected = branches.find(branch => branch.id === value);
  const options = [{ id: "", branchName: required ? "Şube seçin" : "Genel merkez siparişi" }, ...filtered];
  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  useEffect(() => {
    if (open) root.current?.querySelectorAll<HTMLElement>('[role="option"]')[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);
  function select(id: string) { onChange(id); setOpen(false); setQuery(""); setActive(0); trigger.current?.focus(); }
  return <div ref={root} className="relative min-w-0 space-y-1">
    <span id={`${listId}-label`} className="text-base font-bold text-gray-950">Şube</span>
    <input type="hidden" name="branchId" value={value} />
    <button ref={trigger} type="button" role="combobox" aria-labelledby={`${listId}-label`} aria-expanded={open} aria-controls={listId} aria-haspopup="listbox" aria-required={required} disabled={disabled} onClick={() => setOpen(current => !current)} onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); } }} className="flex min-h-10 w-full min-w-0 items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-left text-sm">
      <span className="min-w-0 break-words">{selected?.branchName || (value ? "Şube artık listede yok" : required ? "Şube seçin" : "Genel merkez siparişi")}</span><ChevronDown className="size-4 shrink-0" />
    </button>
    {open ? <div className="absolute right-0 left-0 z-40 mt-1 rounded-lg border bg-white shadow-lg" onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
      if (event.key === "Tab") setOpen(false);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setActive(current => Math.max(0, Math.min(options.length - 1, current + (event.key === "ArrowDown" ? 1 : -1)))); }
      if (event.key === "Enter") { event.preventDefault(); if (options[active]) select(options[active].id); }
    }}>
      <div className="flex items-center gap-2 border-b px-3"><Search className="size-4 shrink-0 text-muted-foreground" /><input ref={search} type="search" role="searchbox" aria-label="Şube ara" aria-controls={listId} aria-activedescendant={`${listId}-${active}`} placeholder="Şube ara" value={query} onChange={event => { setQuery(event.target.value); setActive(1); }} className="h-11 min-w-0 w-full bg-transparent text-sm outline-none" /></div>
      <div id={listId} role="listbox" aria-labelledby={`${listId}-label`} className="max-h-60 overflow-y-auto p-1">{options.map((branch, index) => <button key={branch.id} id={`${listId}-${index}`} type="button" tabIndex={-1} role="option" aria-selected={value === branch.id} onClick={() => select(branch.id)} onMouseEnter={() => setActive(index)} className={`flex min-h-10 w-full items-center justify-between gap-2 rounded px-2 py-2 text-left text-sm ${active === index ? "bg-muted" : ""}`}><span className="min-w-0 break-words">{branch.branchName}</span>{value === branch.id ? <Check className="size-4 shrink-0" /> : null}</button>)}{!filtered.length ? <p className="p-3 text-sm text-muted-foreground">Şube bulunamadı.</p> : null}</div>
    </div> : null}
  </div>;
}
