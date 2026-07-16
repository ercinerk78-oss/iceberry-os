export const BRANCH_TASK_STATUSES = {
  OPEN: "Açık",
  IN_PROGRESS: "Devam Ediyor",
  SUBMITTED: "Gönderildi",
  UNDER_REVIEW: "İncelemede",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
  OVERDUE: "Gecikti",
} as const;

export const BRANCH_TASK_PRIORITIES = {
  LOW: "Düşük",
  NORMAL: "Normal",
  HIGH: "Yüksek",
  URGENT: "Acil",
} as const;

export const TASK_EVIDENCE_TYPES = {
  PHOTO: "Fotoğraf",
  VIDEO: "Video",
  FILE: "Dosya",
  DOCUMENT: "Doküman",
  TEXT: "Metin",
} as const;

export const evidenceTypeForMime = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return "PHOTO";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType === "application/pdf") return "DOCUMENT";

  return "FILE";
};

export const allowedEvidenceMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
] as const;

export const maxEvidenceFileSize = 50 * 1024 * 1024;

export function branchTaskStatusLabel(status: string) {
  return BRANCH_TASK_STATUSES[status as keyof typeof BRANCH_TASK_STATUSES] ?? status;
}

export function branchTaskPriorityLabel(priority: string) {
  return BRANCH_TASK_PRIORITIES[priority as keyof typeof BRANCH_TASK_PRIORITIES] ?? priority;
}
