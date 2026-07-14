export const PIPELINE_STAGES = [
  "Yeni Lead", "İlk Temas", "Sunum Gönderildi", "Görüşme Planlandı",
  "Görüşme Yapıldı", "Lokasyon Aranıyor", "Lokasyon Analizi",
  "Teklif Gönderildi", "Sözleşme Aşaması", "Kurulum Aşaması",
  "Açıldı", "Beklemede", "Kaybedildi",
] as const;

export const TEAM_MEMBERS = ["Ayşe Demir", "Caner Öz", "Dilan Kaya", "Murat Efe"] as const;
export const TASK_PRIORITIES = ["Düşük", "Normal", "Yüksek", "Acil"] as const;
export const TASK_STATUSES = ["Açık", "Devam Ediyor", "Tamamlandı", "İptal Edildi"] as const;

export const isOpenTask = (status: string) => status === "Açık" || status === "Devam Ediyor";
export const isOverdue = (date: string | Date, status?: string) => (!status || isOpenTask(status)) && new Date(date).getTime() < Date.now();
export const isToday = (date: string | Date) => {
  const value = new Date(date); const today = new Date();
  return value.getFullYear() === today.getFullYear() && value.getMonth() === today.getMonth() && value.getDate() === today.getDate();
};
