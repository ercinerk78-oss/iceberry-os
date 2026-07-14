export const DOCUMENT_TYPES={
  LOCATION_ANALYSIS_PDF:"Lokasyon Analizi PDF",
  LOCATION_ANALYSIS_VISUAL:"Lokasyon Analizi Görseli",
  FRANCHISE_PRESENTATION:"Franchise Sunumu",
  NDA:"Gizlilik Sözleşmesi",
  FRANCHISE_AGREEMENT:"Franchise Sözleşmesi",
  LEASE_DOCUMENT:"Kira Dokümanı",
  COMPANY_DOCUMENT:"Şirket Dokümanı",
  BRANCH_DEVELOPMENT_STRATEGY:"Bayi Geliştirme Stratejisi",
  ARCHITECTURAL_PROJECT:"Mimari Proje",
  MALL_APPROVAL:"AVM Onayı",
  MUNICIPAL_DOCUMENT:"Belediye Belgesi",
  PRODUCTION_FILE:"Üretim Dosyası",
  SHIPMENT_DOCUMENT:"Sevkiyat Evrakı",
  TRAINING_DOCUMENT:"Eğitim Belgesi",
  OPENING_VISUAL:"Açılış Görseli",
  OTHER:"Diğer",
} as const;

export type DocumentType=keyof typeof DOCUMENT_TYPES;
export const LOCATION_DOCUMENT_TYPES:DocumentType[]=["LOCATION_ANALYSIS_PDF","LOCATION_ANALYSIS_VISUAL"];
export const MAX_FILE_SIZE=25*1024*1024;
export const ALLOWED_MIME_TYPES=["application/pdf","image/jpeg","image/png"] as const;
export const formatFileSize=(size:number)=>size<1024*1024?`${Math.max(1,Math.ceil(size/1024))} KB`:`${(size/1024/1024).toLocaleString("tr-TR",{maximumFractionDigits:1})} MB`;
export const documentTypeLabel=(type:string)=>DOCUMENT_TYPES[type as DocumentType]??type;
