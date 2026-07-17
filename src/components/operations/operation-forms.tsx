"use client";

import { useActionState } from "react";
import { ClipboardCheck, Send, ShieldCheck } from "lucide-react";

import { createAuditAssignment, createAuditTemplate, saveAuditAnswer } from "@/app/operations/actions";
import { Button } from "@/components/ui/button";
import { AUDIT_TYPE_LABELS, AUDIT_TYPES } from "@/lib/operations/labels";

const initial = { message: "" };

type BranchOption = { id: string; branchName: string };
type TemplateOption = { id: string; name: string; auditType: string; version: number };
type AuditQuestionOption = { id: string; title: string; auditId: string; options: { label: string; value: string }[] };

export function OperationForms({
  branches,
  templates,
  openQuestions,
}: {
  branches: BranchOption[];
  templates: TemplateOption[];
  openQuestions: AuditQuestionOption[];
}) {
  const [templateState, templateAction, templatePending] = useActionState(createAuditTemplate, initial);
  const [assignmentState, assignmentAction, assignmentPending] = useActionState(createAuditAssignment, initial);
  const [answerState, answerAction, answerPending] = useActionState(saveAuditAnswer, initial);
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10);

  return (
    <section className="grid gap-4 xl:grid-cols-3">
      <form action={templateAction} className="rounded-lg border border-[#dfe4dc] bg-white p-4">
        <h3 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4" /> Denetim Şablonu</h3>
        <div className="mt-4 grid gap-3">
          <input name="name" placeholder="Şablon adı" className="h-10 rounded-lg border px-3" />
          <input name="code" placeholder="Kod" className="h-10 rounded-lg border px-3" />
          <Select name="auditType" label="Denetim türü" options={AUDIT_TYPES.map((item) => [item, AUDIT_TYPE_LABELS[item]])} />
          <input name="branchConcept" placeholder="Konsept kapsamı (opsiyonel)" className="h-10 rounded-lg border px-3" />
          <input name="ownershipType" placeholder="Sahiplik türü (opsiyonel)" className="h-10 rounded-lg border px-3" />
          <input name="passingScore" type="number" min={0} max={100} defaultValue={80} className="h-10 rounded-lg border px-3" />
          <Button disabled={templatePending} className="bg-[#17201b] text-white">{templatePending ? "Oluşturuluyor..." : "Şablon Oluştur"}</Button>
          {templateState.message ? <p className="text-sm text-[#65705f]">{templateState.message}</p> : null}
        </div>
      </form>

      <form action={assignmentAction} className="rounded-lg border border-[#dfe4dc] bg-white p-4">
        <h3 className="flex items-center gap-2 font-semibold"><ClipboardCheck className="size-4" /> Denetim Ataması</h3>
        <div className="mt-4 grid gap-3">
          <Select name="branchId" label="Şube" options={branches.map((branch) => [branch.id, branch.branchName])} />
          <Select name="templateId" label="Yayımlanmış şablon" options={templates.map((template) => [template.id, `${template.name} v${template.version}`])} />
          <input name="dueAt" type="date" defaultValue={nextWeek} className="h-10 rounded-lg border px-3" />
          <Select name="priority" label="Öncelik" options={[["LOW", "Düşük"], ["NORMAL", "Normal"], ["HIGH", "Yüksek"], ["URGENT", "Kritik"]]} />
          <input name="assignedAuditorId" placeholder="Denetçi kullanıcı ID (opsiyonel)" className="h-10 rounded-lg border px-3" />
          <Button disabled={assignmentPending} className="bg-[#17201b] text-white">{assignmentPending ? "Atanıyor..." : "Denetim Ata"}</Button>
          {assignmentState.message ? <p className="text-sm text-[#65705f]">{assignmentState.message}</p> : null}
        </div>
      </form>

      <form action={answerAction} className="rounded-lg border border-[#dfe4dc] bg-white p-4">
        <h3 className="flex items-center gap-2 font-semibold"><Send className="size-4" /> Hızlı Denetim Cevabı</h3>
        <div className="mt-4 grid gap-3">
          <select name="questionId" className="h-10 rounded-lg border px-3">
            {openQuestions.map((question) => <option key={question.id} value={question.id}>{question.title}</option>)}
          </select>
          <input name="auditId" value={openQuestions[0]?.auditId ?? ""} readOnly className="h-10 rounded-lg border bg-[#f8faf6] px-3 text-sm text-[#65705f]" />
          <Select name="answerValue" label="Cevap" options={[["PASS", "Uygun"], ["FAIL", "Uygun Değil"], ["NOT_APPLICABLE", "Uygulanamaz"]]} />
          <textarea name="comment" rows={3} placeholder="Açıklama" className="rounded-lg border px-3 py-2" />
          <Button disabled={answerPending || !openQuestions.length} className="bg-[#17201b] text-white">{answerPending ? "Kaydediliyor..." : "Cevabı Kaydet"}</Button>
          {answerState.message ? <p className="text-sm text-[#65705f]">{answerState.message}</p> : null}
        </div>
      </form>
    </section>
  );
}

function Select({ name, label, options }: { name: string; label: string; options: string[][] }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <select name={name} className="h-10 rounded-lg border px-3">
        {options.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
      </select>
    </label>
  );
}
