"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Paperclip, Plus, Send, XCircle } from "lucide-react";

import { approveBranchTask, createBranchTask, rejectBranchTask, submitBranchTask, uploadTaskEvidence, type BranchTaskState } from "@/app/branch-tasks/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { branchTaskPriorityLabel, branchTaskStatusLabel } from "@/lib/branch-tasks";
import { formatDate } from "@/lib/franchise";

type BranchTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  assignedUserId: string | null;
  assignedRole: string | null;
  requiresPhoto: boolean;
  requiresVideo: boolean;
  requiresFile: boolean;
  requiresDescription: boolean;
  requiresResultNote: boolean;
  minimumPhotoCount: number;
  minimumVideoCount: number;
  minimumFileCount: number;
  requiresApproval: boolean;
  evidence: { id: string; evidenceType: string; fileName: string | null; description: string | null }[];
};

const initialState: BranchTaskState = { success: false, message: "" };
const finalStatuses = new Set(["COMPLETED", "CANCELLED", "APPROVED"]);

export function BranchTaskPanel({ branchId, tasks, canReview }: { branchId: string; tasks: BranchTask[]; canReview: boolean }) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h3 className="font-semibold">Şube Görevleri</h3>
          <p className="text-sm text-[#65705f]">Bayi kanıt yükler, görevi gönderir; merkez gerekirse onaylayarak kapatır.</p>
        </div>
        <Button type="button" onClick={() => setShowCreate((value) => !value)} className="bg-[#17201b] text-white">
          <Plus className="size-4" />
          Yeni Görev
        </Button>
      </div>

      {showCreate ? <CreateTaskForm branchId={branchId} onDone={() => setShowCreate(false)} /> : null}

      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} canReview={canReview} />
        ))}
        {!tasks.length ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-[#65705f]">Bu şubeye atanmış görev yok.</p> : null}
      </div>
    </div>
  );
}

function CreateTaskForm({ branchId, onDone }: { branchId: string; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(createBranchTask, initialState);

  useEffect(() => {
    if (state.success) onDone();
  }, [onDone, state.success]);

  return (
    <form action={formAction} className="grid gap-3 rounded-lg border border-[#dfe4dc] bg-[#f8faf6] p-4 md:grid-cols-2">
      <input type="hidden" name="branchId" value={branchId} />
      <Field name="title" label="Görev Başlığı" required />
      <Field name="dueDate" label="Bitiş Tarihi" type="datetime-local" />
      <Select name="priority" label="Öncelik" options={[["NORMAL", "Normal"], ["LOW", "Düşük"], ["HIGH", "Yüksek"], ["URGENT", "Acil"]]} />
      <Field name="assignedRole" label="Atanan Rol" placeholder="Örn. BRANCH_MANAGER" />
      <label className="grid gap-2 text-sm font-medium md:col-span-2">
        <span>Açıklama</span>
        <textarea name="description" rows={3} className="rounded-lg border bg-white p-3" />
      </label>
      <div className="grid gap-2 text-sm md:col-span-2 md:grid-cols-3">
        <input type="hidden" name="requiresApproval" value="off" />
        <CheckField name="requiresDescription" label="Açıklama zorunlu" />
        <CheckField name="requiresPhoto" label="Fotoğraf zorunlu" />
        <CheckField name="requiresFile" label="Dosya zorunlu" />
        <CheckField name="requiresApproval" label="Merkez onayı gerekli" defaultChecked />
      </div>
      {state.message ? <p className={`text-sm md:col-span-2 ${state.success ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
      <div className="flex justify-end gap-2 md:col-span-2">
        <Button type="button" variant="outline" onClick={onDone}>Vazgeç</Button>
        <Button disabled={pending} className="bg-[#17201b] text-white">{pending ? "Kaydediliyor..." : "Görev Oluştur"}</Button>
      </div>
    </form>
  );
}

function TaskCard({ task, canReview }: { task: BranchTask; canReview: boolean }) {
  const [message, setMessage] = useState("");
  const canWork = !finalStatuses.has(task.status);
  const canSubmit = ["OPEN", "IN_PROGRESS", "REJECTED"].includes(task.status);
  const waitingReview = ["SUBMITTED", "UNDER_REVIEW"].includes(task.status);

  async function run(action: () => Promise<BranchTaskState | void>) {
    setMessage("");
    try {
      const result = await action();
      setMessage(result?.message ?? "İşlem tamamlandı.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "İşlem tamamlanamadı.");
    }
  }

  return (
    <article className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{branchTaskStatusLabel(task.status)}</Badge>
            <Badge variant="secondary">{branchTaskPriorityLabel(task.priority)}</Badge>
            {task.requiresApproval ? <Badge variant="outline">Merkez Onayı</Badge> : null}
          </div>
          <h4 className="mt-3 font-semibold">{task.title}</h4>
          {task.description ? <p className="mt-1 text-sm text-[#65705f]">{task.description}</p> : null}
          <p className="mt-2 text-sm text-[#65705f]">Bitiş: {formatDate(task.dueDate)} · Sorumlu: {task.assignedRole || task.assignedUserId || "Atanmadı"}</p>
          <p className="mt-2 text-xs text-[#65705f]">Kanıt: {task.evidence.length} · Gereksinim: {requirements(task)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canSubmit ? (
            <Button type="button" size="sm" variant="outline" onClick={() => run(() => submitBranchTask(task.id, new FormData()))}>
              <Send className="size-4" />
              Gönder
            </Button>
          ) : null}
          {canReview && waitingReview ? (
            <Button type="button" size="sm" className="bg-[#17201b] text-white" onClick={() => run(() => approveBranchTask(task.id, new FormData()))}>
              <Check className="size-4" />
              Onayla ve Kapat
            </Button>
          ) : null}
        </div>
      </div>

      {canWork ? <EvidenceForm taskId={task.id} /> : null}
      {canReview && waitingReview ? <RejectForm taskId={task.id} onDone={setMessage} /> : null}
      {message ? <p className="mt-3 rounded-lg bg-white p-3 text-sm text-[#2f5f20]">{message}</p> : null}
    </article>
  );
}

function EvidenceForm({ taskId }: { taskId: string }) {
  const [state, formAction, pending] = useActionState(uploadTaskEvidence.bind(null, taskId), initialState);

  return (
    <form action={formAction} className="mt-4 grid gap-3 rounded-lg border border-[#dfe4dc] bg-white p-3">
      <label className="grid gap-2 text-sm font-medium">
        <span>Sonuç Açıklaması / Kanıt Notu</span>
        <textarea name="description" rows={2} className="rounded-lg border bg-[#f8faf6] p-3" />
      </label>
      <label className="flex items-center gap-2 text-sm font-medium">
        <Paperclip className="size-4" />
        <input name="files" type="file" multiple className="text-sm" />
      </label>
      {state.message ? <p className={`text-sm ${state.success ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
      <div className="flex justify-end">
        <Button disabled={pending} variant="outline">{pending ? "Yükleniyor..." : "Kanıt Ekle"}</Button>
      </div>
    </form>
  );
}

function RejectForm({ taskId, onDone }: { taskId: string; onDone: (message: string) => void }) {
  const [reason, setReason] = useState("");

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-lg border border-[#f1d2d2] bg-white p-3 md:flex-row">
      <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reddetme nedeni" className="h-10 flex-1 rounded-lg border px-3 text-sm" />
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          const data = new FormData();
          data.set("rejectionReason", reason);
          rejectBranchTask(taskId, data).then(() => onDone("Görev reddedildi.")).catch((error) => onDone(error instanceof Error ? error.message : "Görev reddedilemedi."));
        }}
      >
        <XCircle className="size-4" />
        Reddet
      </Button>
    </div>
  );
}

function requirements(task: BranchTask) {
  const items = [
    task.requiresDescription || task.requiresResultNote ? "açıklama" : "",
    task.requiresPhoto ? `${Math.max(1, task.minimumPhotoCount)} fotoğraf` : "",
    task.requiresVideo ? `${Math.max(1, task.minimumVideoCount)} video` : "",
    task.requiresFile ? `${Math.max(1, task.minimumFileCount)} dosya` : "",
  ].filter(Boolean);

  return items.length ? items.join(", ") : "zorunlu kanıt yok";
}

function Field({ name, label, type = "text", required = false, placeholder = "" }: { name: string; label: string; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      <input required={required} name={name} type={type} placeholder={placeholder} className="h-10 rounded-lg border bg-white px-3" />
    </label>
  );
}

function Select({ name, label, options }: { name: string; label: string; options: string[][] }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      <select name={name} className="h-10 rounded-lg border bg-white px-3">
        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </label>
  );
}

function CheckField({ name, label, defaultChecked = false }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}
