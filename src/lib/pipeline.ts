export const PIPELINE_STAGES = [
  "Yeni Lead",
  "İlk Temas",
  "Sunum Gönderildi",
  "Görüşme Planlandı",
  "Görüşme Yapıldı",
  "Lokasyon Aranıyor",
  "Lokasyon Analizi",
  "Teklif Gönderildi",
  "Sözleşme Aşaması",
  "Kurulum Aşaması",
  "Açıldı",
  "Beklemede",
  "Kaybedildi",
] as const;

export const TEAM_MEMBERS = ["Ayşe Demir", "Caner Öz", "Dilan Kaya", "Murat Efe"] as const;
export const TASK_PRIORITIES = ["Düşük", "Normal", "Yüksek", "Acil"] as const;
export const TASK_STATUSES = ["Açık", "Devam Ediyor", "Tamamlandı", "İptal Edildi"] as const;

export const LEAD_STAGE_STATUS: Record<(typeof PIPELINE_STAGES)[number], string> = {
  "Yeni Lead": "NEW",
  "İlk Temas": "TO_BE_CALLED",
  "Sunum Gönderildi": "UNDER_EVALUATION",
  "Görüşme Planlandı": "APPOINTMENT_SCHEDULED",
  "Görüşme Yapıldı": "MEETING_COMPLETED",
  "Lokasyon Aranıyor": "UNDER_EVALUATION",
  "Lokasyon Analizi": "UNDER_EVALUATION",
  "Teklif Gönderildi": "UNDER_EVALUATION",
  "Sözleşme Aşaması": "UNDER_EVALUATION",
  "Kurulum Aşaması": "UNDER_EVALUATION",
  "Açıldı": "CONVERTED_TO_CANDIDATE",
  "Beklemede": "WAITING_FOR_APPOINTMENT",
  "Kaybedildi": "CLOSED",
};

export const LEAD_PIPELINE_STAGES = [
  "Yeni Lead",
  "İlk Temas",
  "Görüşme Planlandı",
  "Görüşme Yapıldı",
  "Lokasyon Analizi",
  "Beklemede",
  "Kaybedildi",
] as const;

export const isOpenTask = (status: string) => status === "Açık" || status === "Devam Ediyor";

export const isOverdue = (date: string | Date, status?: string) =>
  (!status || isOpenTask(status)) && new Date(date).getTime() < Date.now();

export const isToday = (date: string | Date) => {
  const value = new Date(date);
  const today = new Date();

  return value.getFullYear() === today.getFullYear() && value.getMonth() === today.getMonth() && value.getDate() === today.getDate();
};

export function stageForLeadStatus(status: string) {
  if (["NEW", "Yeni"].includes(status)) return "Yeni Lead";
  if (["TO_BE_CALLED", "Arandı", "UNREACHABLE", "APPOINTMENT_CALL_UNREACHABLE", "Ulaşılamadı"].includes(status)) return "İlk Temas";
  if (["APPOINTMENT_SCHEDULED", "WAITING_FOR_APPOINTMENT", "APPOINTMENT_NO_SHOW_FOLLOW_UP", "Randevu"].includes(status)) return "Görüşme Planlandı";
  if (status === "MEETING_COMPLETED") return "Görüşme Yapıldı";
  if (["UNDER_EVALUATION", "Lokasyon Bekleniyor"].includes(status)) return "Lokasyon Analizi";
  if (["CONVERTED_TO_CANDIDATE", "Adaya Dönüştürüldü"].includes(status)) return "Açıldı";
  if (["CLOSED", "Reddedildi"].includes(status)) return "Kaybedildi";

  return "Yeni Lead";
}
