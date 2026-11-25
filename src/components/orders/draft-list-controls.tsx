"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { draftListCommand } from "@/app/orders/draft-list-actions";
import { draftProgressLabels, normalizeDraftProgress, canSubmitDraftProgress, type DraftProgress } from "@/lib/order-draft-progress";
import type { DraftRecord } from "@/lib/order-draft";

type Editing = { id: string; unsafe: boolean } | null;
const DraftEditingContext = createContext<{ editing: Editing; setEditing: (value: Editing) => void }>({ editing: null, setEditing: () => {} });
export function DraftListProvider({ children }: { children: ReactNode }) {
  const [editing, setEditing] = useState<Editing>(null);
  return <DraftEditingContext.Provider value={{ editing, setEditing }}>{children}</DraftEditingContext.Provider>;
}
export function useDraftListEditing(id: string, unsafe: boolean) {
  const { setEditing } = useContext(DraftEditingContext);
  useEffect(() => { setEditing({ id, unsafe }); return () => setEditing(null); }, [id, unsafe, setEditing]);
}

export function DraftListControls({ record, canManage, isOpen }: { record: DraftRecord; canManage: boolean; isOpen: boolean }) {
  const router = useRouter();
  const { editing } = useContext(DraftEditingContext);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const blocked = isOpen && (!editing || editing.id !== record.id || editing.unsafe);
  const stage = normalizeDraftProgress(record.warehouseDraftStage);
  async function run(command: "progress" | "submit", nextStage?: DraftProgress) {
    if (pending || blocked || !canManage) return;
    setPending(true); setError("");
    try {
      const result = await draftListCommand({ command, id: record.id, version: record.version, ...(nextStage ? { stage: nextStage } : {}) });
      if (!result.ok) { setError(result.error); return; }
      if (isOpen) window.location.assign(`/orders?draft=${encodeURIComponent(record.id)}`);
      else router.refresh();
    } catch { setError("İşlem tamamlanamadı. Sayfayı yenileyip tekrar deneyin."); }
    finally { setPending(false); }
  }
  return <>
    <td className="p-3 align-top"><select aria-label={`${record.orderNumber} hazırlık durumu`} value={stage} disabled={pending || blocked || !canManage} onChange={event => void run("progress", event.target.value as DraftProgress)} className="h-10 w-56 rounded-md border bg-white px-2 text-sm">{Object.entries(draftProgressLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{blocked && <p className="mt-1 max-w-56 text-xs text-amber-800">Açık taslağın kaydını tamamlayın.</p>}{error && <p role="alert" className="mt-1 max-w-56 text-sm text-rose-700">{error}</p>}</td>
    <td className="p-3 align-top"><Button type="button" className="h-auto min-h-10 w-52 whitespace-normal py-2" disabled={pending || blocked || !canManage || !canSubmitDraftProgress(record.warehouseDraftStage)} onClick={() => void run("submit")}><Send className="size-4" />{pending ? "İşleniyor..." : "Merkez Sipariş Onayına Gönder"}</Button></td>
  </>;
}
