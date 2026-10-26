import { ALLOWED_FILE_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE, type DocumentType } from "@/lib/documents";

export function validateDocumentFiles(files: File[], documentType: DocumentType): string | null {
  if (!files.length) return "En az bir dosya seçin.";
  if (files.some((file) => !isAllowedFile(file))) {
    return "PDF, JPG, PNG, Word, Excel, PowerPoint veya ZIP dosyaları yüklenebilir.";
  }
  if (files.some((file) => file.size > MAX_FILE_SIZE)) return "Her dosya en fazla 25 MB olabilir.";
  if (documentType === "LOCATION_ANALYSIS_PDF" && files.some((file) => file.type !== "application/pdf" && extensionFor(file.name) !== ".pdf")) {
    return "Ana rapor alanına yalnızca PDF yükleyebilirsiniz.";
  }
  if (documentType === "LOCATION_ANALYSIS_VISUAL" && files.some((file) => !isImageFile(file))) {
    return "Görsel alanına yalnızca JPG, JPEG veya PNG yükleyebilirsiniz.";
  }

  return null;
}

function isAllowedFile(file: File) {
  return ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number]) || ALLOWED_FILE_EXTENSIONS.includes(extensionFor(file.name) as (typeof ALLOWED_FILE_EXTENSIONS)[number]);
}

function isImageFile(file: File) {
  return ["image/jpeg", "image/png"].includes(file.type) || [".jpg", ".jpeg", ".png"].includes(extensionFor(file.name));
}

function extensionFor(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}
