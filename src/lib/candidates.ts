import type { FranchiseCandidate, Document, CandidateInteraction, CandidateTask } from "@prisma/client";
import type { Candidate } from "@/types/candidate";

type CandidateWithRelations = FranchiseCandidate & { interactions: CandidateInteraction[]; tasks: CandidateTask[]; documents: Document[] };

const date = (value: Date | null) => value?.toISOString() ?? "";

export function toCandidate(candidate: CandidateWithRelations): Candidate {
  return {
    ...candidate,
    whatsapp: candidate.whatsapp ?? "",
    email: candidate.email ?? "",
    district: candidate.district ?? "",
    generalNotes: candidate.generalNotes ?? "",
    lostReason: candidate.lostReason ?? "",
    nextFollowUpAt: date(candidate.nextFollowUpAt),
    lastContactAt: date(candidate.lastContactAt),
    createdAt: candidate.createdAt.toISOString(),
    assignedUserId: candidate.assignedUserId ?? "",
    interactions: candidate.interactions.map((item) => ({
      ...item,
      nextAction: item.nextAction ?? "",
      reminderAt: date(item.reminderAt),
      interactionDate: item.interactionDate.toISOString(),
    })),
    tasks: candidate.tasks.map((task) => ({
      ...task,
      description: task.description ?? "",
      assignedUserId: task.assignedUserId ?? "",
      dueDate: task.dueDate.toISOString(),
      completedAt: date(task.completedAt),
      createdAt: task.createdAt.toISOString(),
    })),
    documents: candidate.documents.map((document) => ({
      ...document,
      description: document.description ?? "",
      uploadedBy: document.uploadedBy ?? "",
      uploadedAt: document.uploadedAt.toISOString(),
      customerSharedAt: date(document.customerSharedAt),
      archivedAt: date(document.archivedAt),
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    })),
  };
}

export function formatDate(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
