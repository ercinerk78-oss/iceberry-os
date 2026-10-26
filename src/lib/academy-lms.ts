import type { TrainingLessonType } from "@prisma/client";

export const ACADEMY_MAX_FILE_SIZE = 100 * 1024 * 1024;

export const academyMediaAccept =
  ".mp4,.mov,.webm,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip,video/mp4,video/quicktime,video/webm,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png,application/zip";

export const academyMediaTypeLabels: Record<string, string> = {
  VIDEO: "Video",
  PDF: "PDF",
  WORD: "Word",
  EXCEL: "Excel",
  POWERPOINT: "PowerPoint",
  IMAGE: "Görsel",
  ZIP: "ZIP",
  YOUTUBE: "YouTube",
  VIMEO: "Vimeo",
  DOCUMENT: "Doküman",
  LINK: "Bağlantı",
};

const mimeMap: Record<string, string> = {
  "video/mp4": "VIDEO",
  "video/quicktime": "VIDEO",
  "video/webm": "VIDEO",
  "application/pdf": "PDF",
  "application/msword": "WORD",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "WORD",
  "application/vnd.ms-excel": "EXCEL",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "EXCEL",
  "application/vnd.ms-powerpoint": "POWERPOINT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "POWERPOINT",
  "image/jpeg": "IMAGE",
  "image/png": "IMAGE",
  "application/zip": "ZIP",
  "application/x-zip-compressed": "ZIP",
};

const extensionMap: Record<string, string> = {
  mp4: "VIDEO",
  mov: "VIDEO",
  webm: "VIDEO",
  pdf: "PDF",
  doc: "WORD",
  docx: "WORD",
  xls: "EXCEL",
  xlsx: "EXCEL",
  ppt: "POWERPOINT",
  pptx: "POWERPOINT",
  jpg: "IMAGE",
  jpeg: "IMAGE",
  png: "IMAGE",
  zip: "ZIP",
};

export function academyMediaTypeFromFile(file: File) {
  const byMime = mimeMap[file.type];
  if (byMime) return byMime;

  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  return extensionMap[extension] || null;
}

export function lessonTypeFromMediaType(mediaType: string): TrainingLessonType {
  if (mediaType === "VIDEO" || mediaType === "YOUTUBE" || mediaType === "VIMEO") return "VIDEO";
  if (mediaType === "PDF") return "PDF";
  if (mediaType === "IMAGE") return "IMAGE";
  if (mediaType === "LINK") return "EXTERNAL_LINK";
  return "DOCUMENT";
}

export function sourceTypeFromUrl(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "YOUTUBE";
    if (host.includes("vimeo.com")) return "VIMEO";
    return null;
  } catch {
    return null;
  }
}

export function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function formatAcademyFileSize(size: number | null | undefined) {
  if (!size) return "Boyut yok";
  if (size < 1024 * 1024) return `${Math.round(size / 1024).toLocaleString("tr-TR")} KB`;
  return `${(size / 1024 / 1024).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} MB`;
}
