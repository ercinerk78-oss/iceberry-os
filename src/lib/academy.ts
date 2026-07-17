import type {
  CertificateStatus,
  CorporateDocumentStatus,
  DocumentAcknowledgementStatus,
  DocumentConfidentiality,
  DocumentVersionStatus,
  LessonProgressStatus,
  LiveAttendanceStatus,
  LiveTrainingStatus,
  QuizAttemptStatus,
  QuizQuestionType,
  QuizStatus,
  TrainingAssignmentSource,
  TrainingAssignmentStatus,
  TrainingDifficulty,
  TrainingLessonType,
  TrainingProgramStatus,
  TrainingResult,
} from "@prisma/client";

export const trainingCategorySeed = [
  "Marka Oryantasyonu",
  "Ürün ve Reçete",
  "Gıda Güvenliği",
  "Hijyen",
  "Müşteri Deneyimi",
  "Satış Teknikleri",
  "Operasyon",
  "Stok ve Depo",
  "Kasa ve Finans",
  "Şube Yönetimi",
  "Personel Yönetimi",
  "İş Sağlığı ve Güvenliği",
  "Ekipman Kullanımı",
  "Bakım ve Arıza",
  "Dijital Sistemler",
  "Açılış Eğitimi",
  "Franchise Yatırımcı Eğitimi",
  "Saha Denetçisi Eğitimi",
  "Yönetici Gelişimi",
  "Zorunlu Yasal Eğitimler",
  "Diğer",
] as const;

export const corporateDocumentCategorySeed = [
  "Operasyon Prosedürleri",
  "Reçeteler",
  "Marka Standartları",
  "El Kitapları",
  "Formlar",
  "Politika ve Talimatlar",
  "Açılış Dokümanları",
  "Denetim Dokümanları",
] as const;

export const programStatusLabels: Record<TrainingProgramStatus, string> = {
  DRAFT: "Taslak",
  REVIEW: "İncelemede",
  APPROVED: "Onaylandı",
  PUBLISHED: "Yayımlandı",
  ARCHIVED: "Arşivlendi",
};

export const difficultyLabels: Record<TrainingDifficulty, string> = {
  BEGINNER: "Başlangıç",
  INTERMEDIATE: "Orta",
  ADVANCED: "İleri",
  EXPERT: "Uzmanlık",
};

export const lessonTypeLabels: Record<TrainingLessonType, string> = {
  VIDEO: "Video",
  TEXT: "Metin",
  DOCUMENT: "Doküman",
  PDF: "PDF",
  IMAGE: "Görsel",
  EXTERNAL_LINK: "Dış Bağlantı",
  QUIZ: "Sınav",
  PRACTICAL_TASK: "Uygulamalı Görev",
  ACKNOWLEDGEMENT: "Okundu ve Kabul Edildi",
};

export const assignmentStatusLabels: Record<TrainingAssignmentStatus, string> = {
  ASSIGNED: "Atandı",
  NOT_STARTED: "Başlamadı",
  IN_PROGRESS: "Devam Ediyor",
  COMPLETED: "Tamamlandı",
  FAILED: "Başarısız",
  OVERDUE: "Süresi Geçti",
  EXEMPTED: "Muaf Tutuldu",
  CANCELLED: "İptal Edildi",
  EXPIRED: "Geçerliliği Doldu",
  RENEWAL_REQUIRED: "Yenileme Gerekli",
};

export const assignmentSourceLabels: Record<TrainingAssignmentSource, string> = {
  MANUAL: "Manuel Atama",
  ROLE_BASED: "Rol Bazlı Atama",
  BRANCH_BASED: "Şube Bazlı Atama",
  CONCEPT_BASED: "Konsept Bazlı Atama",
  ORIENTATION: "Yeni Kullanıcı Oryantasyonu",
  OPENING_PROJECT: "Açılış Projesi",
  AUDIT_FINDING: "Denetim Bulgusu",
  CORRECTIVE_ACTION: "Düzeltici Faaliyet",
  DEVELOPMENT_PLAN: "Gelişim Planı",
  DOCUMENT_UPDATE: "Belge Güncellemesi",
  CERTIFICATE_RENEWAL: "Sertifika Yenileme",
  SYSTEM_POLICY: "Sistem Politikası",
  OTHER: "Diğer",
};

export const trainingResultLabels: Record<TrainingResult, string> = {
  PASSED: "Başarılı",
  FAILED: "Başarısız",
  PENDING_APPROVAL: "Onay Bekliyor",
};

export const lessonProgressStatusLabels: Record<LessonProgressStatus, string> = {
  NOT_STARTED: "Başlamadı",
  IN_PROGRESS: "Devam Ediyor",
  COMPLETED: "Tamamlandı",
  FAILED: "Başarısız",
};

export const quizStatusLabels: Record<QuizStatus, string> = {
  DRAFT: "Taslak",
  REVIEW: "İncelemede",
  PUBLISHED: "Yayımlandı",
  ARCHIVED: "Arşivlendi",
};

export const quizQuestionTypeLabels: Record<QuizQuestionType, string> = {
  SINGLE_CHOICE: "Tekli Seçim",
  MULTIPLE_CHOICE: "Çoklu Seçim",
  TRUE_FALSE: "Doğru / Yanlış",
  TEXT: "Metin",
};

export const quizAttemptStatusLabels: Record<QuizAttemptStatus, string> = {
  IN_PROGRESS: "Devam Ediyor",
  SUBMITTED: "Gönderildi",
  EVALUATED: "Değerlendirildi",
  CANCELLED: "İptal Edildi",
};

export const certificateStatusLabels: Record<CertificateStatus, string> = {
  ACTIVE: "Aktif",
  EXPIRED: "Süresi Doldu",
  REVOKED: "İptal Edildi",
  RENEWED: "Yenilendi",
};

export const corporateDocumentStatusLabels: Record<CorporateDocumentStatus, string> = {
  DRAFT: "Taslak",
  REVIEW: "İncelemede",
  APPROVED: "Onaylandı",
  PUBLISHED: "Yayımlandı",
  ARCHIVED: "Arşivlendi",
};

export const documentVersionStatusLabels: Record<DocumentVersionStatus, string> = corporateDocumentStatusLabels;

export const confidentialityLabels: Record<DocumentConfidentiality, string> = {
  PUBLIC: "Genel",
  INTERNAL: "İç Kullanım",
  CONFIDENTIAL: "Gizli",
  RESTRICTED: "Çok Gizli",
};

export const acknowledgementStatusLabels: Record<DocumentAcknowledgementStatus, string> = {
  ASSIGNED: "Atandı",
  OPENED: "Açıldı",
  ACKNOWLEDGED: "Kabul Edildi",
  OVERDUE: "Süresi Geçti",
  CANCELLED: "İptal Edildi",
};

export const liveTrainingStatusLabels: Record<LiveTrainingStatus, string> = {
  PLANNED: "Planlandı",
  OPEN_FOR_REGISTRATION: "Kayıt Açık",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
};

export const liveAttendanceStatusLabels: Record<LiveAttendanceStatus, string> = {
  REGISTERED: "Kayıtlı",
  ATTENDED: "Katıldı",
  NO_SHOW: "Katılmadı",
  CANCELLED: "İptal Edildi",
};

export function academyCode(value: string) {
  return value
    .toLocaleUpperCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("İ", "I")
    .replaceAll("Ş", "S")
    .replaceAll("Ğ", "G")
    .replaceAll("Ü", "U")
    .replaceAll("Ö", "O")
    .replaceAll("Ç", "C")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function dateTR(value: Date | string | null | undefined) {
  if (!value) return "Belirtilmedi";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" }).format(new Date(value));
}

export function percentTR(value: number) {
  return `%${value.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;
}
