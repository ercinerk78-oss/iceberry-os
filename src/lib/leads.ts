import { translate, type Locale } from "@/lib/i18n/messages";

export const LEAD_SOURCES = ["Instagram", "Facebook", "Web", "WhatsApp", "Manuel"] as const;
export const LEAD_CONCEPTS = ["Corner", "Cafe", "Self Cafe"] as const;

export const LEAD_STATUSES = [
  "NEW",
  "TO_BE_CALLED",
  "UNREACHABLE",
  "APPOINTMENT_SCHEDULED",
  "WAITING_FOR_APPOINTMENT",
  "MEETING_COMPLETED",
  "UNDER_EVALUATION",
  "CONVERTED_TO_CANDIDATE",
  "CLOSED",
] as const;

export const LEAD_STATUS_LABELS: Record<(typeof LEAD_STATUSES)[number], string> = {
  NEW: "Yeni Lead",
  TO_BE_CALLED: "Aranacak",
  UNREACHABLE: "Ulaşılamadı",
  APPOINTMENT_SCHEDULED: "Randevu Alındı",
  WAITING_FOR_APPOINTMENT: "Randevu Bekliyor",
  MEETING_COMPLETED: "Görüşme Yapıldı",
  UNDER_EVALUATION: "Değerlendiriliyor",
  CONVERTED_TO_CANDIDATE: "Adaya Dönüştürüldü",
  CLOSED: "Kapatıldı",
};

export const LEGACY_LEAD_STATUS_ALIASES: Record<string, (typeof LEAD_STATUSES)[number]> = {
  Yeni: "NEW",
  Arandı: "TO_BE_CALLED",
  "Ulaşılamadı": "UNREACHABLE",
  Randevu: "APPOINTMENT_SCHEDULED",
  "Lokasyon Bekleniyor": "UNDER_EVALUATION",
  Reddedildi: "CLOSED",
  "Adaya Dönüştürüldü": "CONVERTED_TO_CANDIDATE",
};

export const LEAD_CATEGORIES = [
  "POSITIVE",
  "CLOSE_FOLLOW_UP",
  "LONG_TERM",
  "UNPRODUCTIVE",
  "INVALID_FORM",
] as const;

export const LEAD_CATEGORY_LABELS: Record<(typeof LEAD_CATEGORIES)[number], string> = {
  POSITIVE: "Olumlu Lead",
  CLOSE_FOLLOW_UP: "Yakın Takip Lead",
  LONG_TERM: "Uzun Vade Lead",
  UNPRODUCTIVE: "Verimsiz Lead",
  INVALID_FORM: "Hatalı Form",
};

export const INVALID_LEAD_REASONS = [
  "WRONG_PHONE",
  "MISSING_INFO",
  "FAKE_APPLICATION",
  "DUPLICATE_APPLICATION",
  "TEST_APPLICATION",
  "IRRELEVANT_APPLICATION",
  "OTHER",
] as const;

export const INVALID_LEAD_REASON_LABELS: Record<(typeof INVALID_LEAD_REASONS)[number], string> = {
  WRONG_PHONE: "Yanlış Telefon",
  MISSING_INFO: "Eksik Bilgi",
  FAKE_APPLICATION: "Sahte Başvuru",
  DUPLICATE_APPLICATION: "Mükerrer Başvuru",
  TEST_APPLICATION: "Test Başvurusu",
  IRRELEVANT_APPLICATION: "Alakasız Başvuru",
  OTHER: "Diğer",
};

export const LEAD_ACTIVITY_TYPES = [
  "Telefon edildi",
  "WhatsApp gönderildi",
  "Not eklendi",
  "Arama sonucu",
  "Randevu oluşturuldu",
  "Randevu tamamlandı",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadCategory = (typeof LEAD_CATEGORIES)[number];

export type LeadView = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  city: string;
  source: string;
  requestedConcept: string;
  status: string;
  processStatus: string;
  leadCategory: string;
  invalidReason: string;
  invalidReasonDetail: string;
  nextFollowUpAt: string;
  assignedUserId: string;
  lastContactAt: string;
  investmentBudget: string;
  interestedLocation: string;
  description: string;
  sourceData: string;
  sourceFieldValues: string;
  manualOverrideFields: string[];
  lastSyncedAt: string;
  leadDate: string;
  convertedCandidateId: string;
  activities: { id: string; type: string; description: string; createdAt: string }[];
  concepts: { id: string; name: string; code: string }[];
  appointments?: {
    id: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentType: string;
    startDateTime: string;
    endDateTime: string;
    status: string;
    title: string;
    description: string;
    location: string;
    meetingLink: string;
    notes: string;
    outcome: string;
    result: string;
    cancellationReason: string;
    rescheduleReason: string;
    previousAppointmentDate: string;
    assignedUserId: string;
    completedAt: string;
    cancelledAt: string;
  }[];
  tasks?: {
    id: string;
    title: string;
    description: string;
    dueDate: string;
    priority: string;
    status: string;
    assignedUserId: string;
    completedAt: string;
  }[];
  candidateLocations?: {
    id: string;
    matchStatus: string;
    nextFollowUpAt: string;
    notes: string;
    location: {
      id: string;
      name: string;
      city: string;
      district: string;
      areaM2: number | null;
      monthlyRent: string;
      transferFee: string;
      status: string;
      documents: { id: string; fileName: string; documentType: string; archivedAt: string }[];
    };
  }[];
};

export function leadStatusLabel(status: string, locale?: Locale) {
  const canonical = canonicalLeadStatus(status);

  return canonical ? translate(locale, `leadStatus.${canonical}`, LEAD_STATUS_LABELS[canonical]) : status;
}

export function leadCategoryLabel(category?: string | null, locale?: Locale) {
  return category && category in LEAD_CATEGORY_LABELS
    ? translate(locale, `leadCategory.${category}`, LEAD_CATEGORY_LABELS[category as LeadCategory])
    : translate(locale, "leadCategory.NONE", "Kategori yok");
}

export function canonicalLeadStatus(status: string) {
  if ((LEAD_STATUSES as readonly string[]).includes(status)) return status as LeadStatus;

  return LEGACY_LEAD_STATUS_ALIASES[status];
}

export function statusValuesForFilter(status: string) {
  const legacy = Object.entries(LEGACY_LEAD_STATUS_ALIASES)
    .filter(([, value]) => value === status)
    .map(([key]) => key);

  return [status, ...legacy];
}

type LeadRecord = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  city: string;
  source: string;
  requestedConcept: string;
  status: string;
  processStatus?: string | null;
  leadCategory?: string | null;
  invalidReason?: string | null;
  invalidReasonDetail?: string | null;
  nextFollowUpAt?: Date | null;
  assignedUserId?: string | null;
  lastContactAt?: Date | null;
  investmentBudget?: string | null;
  interestedLocation?: string | null;
  description?: string | null;
  sourceData?: string | null;
  sourceFieldValues?: string | null;
  manualOverrideFields?: string | null;
  lastSyncedAt?: Date | null;
  leadDate: Date;
  convertedCandidateId: string | null;
  activities: { id: string; type: string; description: string; createdAt: Date }[];
  concepts?: { concept: { id: string; name: string; code: string } }[];
  appointments?: {
    id: string;
    appointmentDate: Date;
    appointmentTime: string;
    appointmentType: string;
    startDateTime?: Date | null;
    endDateTime?: Date | null;
    status: string;
    title: string;
    description?: string | null;
    location?: string | null;
    meetingLink?: string | null;
    notes: string | null;
    outcome: string | null;
    result?: string | null;
    cancellationReason?: string | null;
    rescheduleReason?: string | null;
    previousAppointmentDate?: Date | null;
    assignedUserId: string | null;
    completedAt: Date | null;
    cancelledAt: Date | null;
  }[];
  tasks?: {
    id: string;
    title: string;
    description: string | null;
    dueDate: Date;
    priority: string;
    status: string;
    assignedUserId: string | null;
    completedAt: Date | null;
  }[];
  candidateLocations?: {
    id: string;
    matchStatus: string;
    nextFollowUpAt: Date | null;
    notes: string | null;
    location: {
      id: string;
      name: string;
      city: string;
      district: string | null;
      areaM2: number | null;
      monthlyRent: unknown;
      transferFee: unknown;
      status: string;
      documents: { id: string; fileName: string; documentType: string; archivedAt: Date | null }[];
    };
  }[];
};

export function toLead(lead: LeadRecord): LeadView {
  return {
    ...lead,
    email: lead.email ?? "",
    processStatus: lead.processStatus || canonicalLeadStatus(lead.status) || lead.status,
    leadCategory: lead.leadCategory ?? "",
    invalidReason: lead.invalidReason ?? "",
    invalidReasonDetail: lead.invalidReasonDetail ?? "",
    nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? "",
    assignedUserId: lead.assignedUserId ?? "",
    lastContactAt: lead.lastContactAt?.toISOString() ?? "",
    investmentBudget: lead.investmentBudget ?? "",
    interestedLocation: lead.interestedLocation ?? "",
    description: lead.description ?? "",
    sourceData: lead.sourceData ?? "",
    sourceFieldValues: lead.sourceFieldValues ?? "",
    manualOverrideFields: parseOverrideFields(lead.manualOverrideFields),
    lastSyncedAt: lead.lastSyncedAt?.toISOString() ?? "",
    convertedCandidateId: lead.convertedCandidateId ?? "",
    leadDate: lead.leadDate.toISOString(),
    activities: lead.activities.map((activity) => ({
      ...activity,
      createdAt: activity.createdAt.toISOString(),
    })),
    concepts: lead.concepts?.map((item) => item.concept) ?? [{ id: "", name: lead.requestedConcept, code: lead.requestedConcept }].filter((item) => item.name),
    appointments: lead.appointments?.map((appointment) => ({
      ...appointment,
      appointmentDate: appointment.appointmentDate.toISOString(),
      startDateTime: appointment.startDateTime?.toISOString() ?? appointment.appointmentDate.toISOString(),
      endDateTime: appointment.endDateTime?.toISOString() ?? "",
      description: appointment.description ?? "",
      location: appointment.location ?? "",
      meetingLink: appointment.meetingLink ?? "",
      notes: appointment.notes ?? "",
      outcome: appointment.outcome ?? "",
      result: appointment.result ?? "",
      cancellationReason: appointment.cancellationReason ?? "",
      rescheduleReason: appointment.rescheduleReason ?? "",
      previousAppointmentDate: appointment.previousAppointmentDate?.toISOString() ?? "",
      assignedUserId: appointment.assignedUserId ?? "Atanmadı",
      completedAt: appointment.completedAt?.toISOString() ?? "",
      cancelledAt: appointment.cancelledAt?.toISOString() ?? "",
    })),
    tasks: lead.tasks?.map((task) => ({
      ...task,
      description: task.description ?? "",
      dueDate: task.dueDate.toISOString(),
      assignedUserId: task.assignedUserId ?? "Atanmadı",
      completedAt: task.completedAt?.toISOString() ?? "",
    })),
    candidateLocations: lead.candidateLocations?.map((match) => ({
      ...match,
      nextFollowUpAt: match.nextFollowUpAt?.toISOString() ?? "",
      notes: match.notes ?? "",
      location: {
        ...match.location,
        district: match.location.district ?? "",
        monthlyRent: match.location.monthlyRent?.toString?.() ?? "",
        transferFee: match.location.transferFee?.toString?.() ?? "",
        documents: match.location.documents.map((document) => ({
          ...document,
          archivedAt: document.archivedAt?.toISOString() ?? "",
        })),
      },
    })),
  };
}

function parseOverrideFields(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
