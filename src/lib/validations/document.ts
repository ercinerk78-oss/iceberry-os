import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, type DocumentType } from "@/lib/documents";

export function validateDocumentFiles(files:File[],documentType:DocumentType):string|null{
  if(!files.length)return"En az bir dosya seçin.";
  if(files.some(file=>!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])))return"Yalnızca PDF, JPG, JPEG veya PNG dosyaları yüklenebilir.";
  if(files.some(file=>file.size>MAX_FILE_SIZE))return"Her dosya en fazla 25 MB olabilir.";
  if(documentType==="LOCATION_ANALYSIS_PDF"&&files.some(file=>file.type!=="application/pdf"))return"Ana rapor alanına yalnızca PDF yükleyebilirsiniz.";
  if(documentType==="LOCATION_ANALYSIS_VISUAL"&&files.some(file=>!["image/jpeg","image/png"].includes(file.type)))return"Görsel alanına yalnızca JPG, JPEG veya PNG yükleyebilirsiniz.";
  return null;
}
