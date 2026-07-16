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
] as const;

export const LEAD_CATEGORY_LABELS: Record<(typeof LEAD_CATEGORIES)[number], string> = {
  POSITIVE: "Olumlu Lead",
  CLOSE_FOLLOW_UP: "Yakın Takip Lead",
  LONG_TERM: "Uzun Vade Lead",
  UNPRODUCTIVE: "Verimsiz Lead",
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
  leadCategory: string;
  nextFollowUpAt: string;
  leadDate: string;
  convertedCandidateId: string;
  activities: { id: string; type: string; description: string; createdAt: string }[];
  appointments?: {
    id: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentType: string;
    status: string;
    title: string;
    notes: string;
    outcome: string;
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
};

export function leadStatusLabel(status: string) {
  const canonical = canonicalLeadStatus(status);

  return canonical ? LEAD_STATUS_LABELS[canonical] : status;
}

export function leadCategoryLabel(category?: string | null) {
  return category && category in LEAD_CATEGORY_LABELS
    ? LEAD_CATEGORY_LABELS[category as LeadCategory]
    : "Kategori yok";
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
  leadCategory?: string | null;
  nextFollowUpAt?: Date | null;
  leadDate: Date;
  convertedCandidateId: string | null;
  activities: { id: string; type: string; description: string; createdAt: Date }[];
  appointments?: {
    id: string;
    appointmentDate: Date;
    appointmentTime: string;
    appointmentType: string;
    status: string;
    title: string;
    notes: string | null;
    outcome: string | null;
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
};

export function toLead(lead: LeadRecord): LeadView {
  return {
    ...lead,
    email: lead.email ?? "",
    leadCategory: lead.leadCategory ?? "",
    nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? "",
    convertedCandidateId: lead.convertedCandidateId ?? "",
    leadDate: lead.leadDate.toISOString(),
    activities: lead.activities.map((activity) => ({
      ...activity,
      createdAt: activity.createdAt.toISOString(),
    })),
    appointments: lead.appointments?.map((appointment) => ({
      ...appointment,
      appointmentDate: appointment.appointmentDate.toISOString(),
      notes: appointment.notes ?? "",
      outcome: appointment.outcome ?? "",
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
  };
}
