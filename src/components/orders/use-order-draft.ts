"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { draftRequest, draftValuesSchema, type DraftRecord, type DraftRequest, type DraftValues } from "@/lib/order-draft";

export function useOrderDraft({ id, userId, warehouseId, initialValues, initialRecord }: { id: string; userId: string; warehouseId: string; initialValues: DraftValues; initialRecord: DraftRecord | null }) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [record, setRecord] = useState(initialRecord);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [recovery, setRecovery] = useState<DraftValues | null>(null);
  const [unsaved, setUnsaved] = useState(false);
  const [reviewingRecovery, setReviewingRecovery] = useState(false);
  const [localBackupAvailable, setLocalBackupAvailable] = useState(true);
  const valuesRef = useRef(initialValues);
  const recordRef = useRef(initialRecord);
  const version = useRef(initialRecord?.version ?? 0);
  const dirty = useRef(false);
  const blockedRef = useRef(false);
  const recoveryReview = useRef(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const signature = useRef(JSON.stringify(draftRequest(initialValues, id, 0, warehouseId, "save")));
  const cacheKey = `iceberry.order-draft.${userId}.${id}`;
  const closed = record !== null && record.status !== "DRAFT";
  const cache = useCallback(() => {
    try { localStorage.setItem(cacheKey, JSON.stringify({ version: version.current, values: valuesRef.current, dirty: dirty.current, needsReview: recoveryReview.current })); setLocalBackupAvailable(true); }
    catch { setLocalBackupAvailable(false); }
  }, [cacheKey]);
  const change = useCallback((update: (previous: DraftValues) => DraftValues) => {
    const next = update(valuesRef.current);
    valuesRef.current = next; dirty.current = true;
    setValues(next); setUnsaved(true); cache();
  }, [cache]);

  useEffect(() => {
    let cancelled = false;
    const query = new URL(window.location.href);
    query.searchParams.set("draft", id); query.searchParams.delete("new");
    window.history.replaceState(null, "", query);
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const saved = JSON.parse(localStorage.getItem(cacheKey) || "null");
        const parsed = draftValuesSchema.safeParse(saved?.values);
        if (parsed.success && saved.version === version.current) {
          valuesRef.current = parsed.data; dirty.current = Boolean(saved.dirty); setValues(parsed.data); setUnsaved(Boolean(saved.dirty));
          recoveryReview.current = Boolean(saved.needsReview); setReviewingRecovery(Boolean(saved.needsReview));
        } else if (parsed.success && saved.dirty) {
          setRecovery(parsed.data); setError("Taslağın sunucudaki sürümü değişmiş. Bu cihazdaki kaydedilmemiş değişiklikleri isterseniz geri yükleyebilirsiniz.");
        }
      } catch { /* Ignore an unreadable local cache; the saved server draft remains available. */ }
      setReady(true);
    });
    return () => { cancelled = true; };
  }, [cacheKey, id]);

  const save = useCallback((command: DraftRequest["command"] = "save"): Promise<DraftRecord> => {
    const work = queue.current.catch(() => undefined).then(async () => {
      if (blockedRef.current) throw new Error("Güncel taslağı yeniden açın; yerel değişiklikleriniz korunuyor.");
      if (recoveryReview.current) throw new Error("Yerel kopyayı kaydetmeden önce değişiklikleri onaylayın.");
      if (recordRef.current && recordRef.current.status !== "DRAFT") {
        if (command === "submit" && recordRef.current.status === "SUBMITTED") return recordRef.current;
        throw new Error("Bu sipariş artık taslak değil.");
      }
      const snapshot = valuesRef.current;
      const nextSignature = JSON.stringify(draftRequest(snapshot, id, 0, warehouseId, "save"));
      if (command === "save" && recordRef.current && nextSignature === signature.current) { dirty.current = false; setUnsaved(false); cache(); return recordRef.current; }
      setBusy(true); setError("");
      try {
        const response = await fetch("/orders/drafts", { method: "POST", headers: { "Content-Type": "application/json", "x-iceberry-draft": "1" }, keepalive: true,
          body: JSON.stringify(draftRequest(snapshot, id, version.current, warehouseId, command)) });
        const result = await response.json();
        if (!response.ok) {
          if (response.status === 409) { blockedRef.current = true; setBlocked(true); }
          throw new Error(result.error || "Taslak kaydedilemedi.");
        }
        const saved = result as DraftRecord;
        const firstSave = recordRef.current === null;
        version.current = saved.version; recordRef.current = saved; signature.current = nextSignature;
        dirty.current = JSON.stringify(draftRequest(valuesRef.current, id, 0, warehouseId, "save")) !== nextSignature;
        setRecord(saved); setUnsaved(dirty.current); cache();
        if (firstSave || command !== "save") router.refresh();
        return saved;
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : "Taslak kaydedilemedi. Yerel değişiklikleriniz korunuyor.");
        throw failure;
      } finally { setBusy(false); }
    });
    queue.current = work;
    return work;
  }, [cache, id, router, warehouseId]);

  useEffect(() => {
    if (!ready || closed || blocked || reviewingRecovery || !dirty.current) return;
    const timer = setTimeout(() => { void save().catch(() => undefined); }, 700);
    return () => clearTimeout(timer);
  }, [values, ready, closed, blocked, reviewingRecovery, save]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty.current && recordRef.current?.status !== "SUBMITTED") { cache(); event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [cache]);
  const restore = () => {
    if (!recovery) return;
    recoveryReview.current = true; setReviewingRecovery(true);
    change(() => recovery); setRecovery(null); setError("");
  };
  const confirmRecovery = () => { recoveryReview.current = false; setReviewingRecovery(false); cache(); return save(); };
  const reopen = () => { cache(); dirty.current = false; window.location.reload(); };
  return { values, change, save, record, ready, busy, error, blocked, recovery, restore, reopen, closed, unsaved, reviewingRecovery, confirmRecovery, localBackupAvailable };
}
