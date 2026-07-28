import { translate, type Locale } from "@/lib/i18n/messages";

export const APPOINTMENT_TYPES = ["PHONE", "ONLINE", "FACE_TO_FACE"] as const;
export const APPOINTMENT_STATUSES = [
  "SCHEDULED",
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
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
  NO_SHOW: "Gelmedi",
  RESCHEDULED: "Ertelendi",
};

export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export function appointmentTypeLabel(type: string, locale?: Locale) {
  return type in APPOINTMENT_TYPE_LABELS
    ? translate(locale, `appointmentType.${type}`, APPOINTMENT_TYPE_LABELS[type as AppointmentType])
    : type;
}

export function appointmentStatusLabel(status: string, locale?: Locale) {
  return status in APPOINTMENT_STATUS_LABELS
    ? translate(locale, `appointmentStatus.${status}`, APPOINTMENT_STATUS_LABELS[status as AppointmentStatus])
    : status;
}

export const APPOINTMENT_TIME_ZONE = "Europe/Istanbul";
const TURKEY_UTC_OFFSET_HOURS = 3;

function parseDateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function parseTimeParts(time: string) {
  const [hour = 9, minute = 0, second = 0] = (time || "09:00").split(":").map(Number);
  return { hour, minute, second };
}

export function combineAppointmentDate(date: string, time: string) {
  const { year, month, day } = parseDateParts(date);
  const { hour, minute, second } = parseTimeParts(time);

  return new Date(Date.UTC(year, month - 1, day, hour - TURKEY_UTC_OFFSET_HOURS, minute, second));
}

export function appointmentDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APPOINTMENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";

  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

export function appointmentDayRange(date: string) {
  return {
    start: combineAppointmentDate(date, "00:00"),
    end: combineAppointmentDate(date, "24:00"),
  };
}

export function todayInAppointmentTimeZone(now = new Date()) {
  return appointmentDateParts(now).date;
}

export function formatAppointmentDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: APPOINTMENT_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
