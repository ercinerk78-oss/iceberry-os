export const APPOINTMENT_TYPES = ["PHONE", "ONLINE", "FACE_TO_FACE"] as const;
export const APPOINTMENT_STATUSES = [
  "SCHEDULED",
  "WAITING",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "RESCHEDULED",
] as const;

export const APPOINTMENT_TYPE_LABELS: Record<(typeof APPOINTMENT_TYPES)[number], string> = {
  PHONE: "Telefon",
  ONLINE: "Online",
  FACE_TO_FACE: "Yüz Yüze",
};

export const APPOINTMENT_STATUS_LABELS: Record<(typeof APPOINTMENT_STATUSES)[number], string> = {
  SCHEDULED: "Planlandı",
  WAITING: "Bekliyor",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
  NO_SHOW: "Gelmedi",
  RESCHEDULED: "Ertelendi",
};

export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export function appointmentTypeLabel(type: string) {
  return type in APPOINTMENT_TYPE_LABELS
    ? APPOINTMENT_TYPE_LABELS[type as AppointmentType]
    : type;
}

export function appointmentStatusLabel(status: string) {
  return status in APPOINTMENT_STATUS_LABELS
    ? APPOINTMENT_STATUS_LABELS[status as AppointmentStatus]
    : status;
}

export function combineAppointmentDate(date: string, time: string) {
  return new Date(`${date}T${time || "09:00"}:00`);
}

export function appointmentDateParts(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");

  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
}
