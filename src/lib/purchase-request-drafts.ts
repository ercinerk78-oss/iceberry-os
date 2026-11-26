export function purchaseRequestDraftWarning(status: string, createdAt: Date, now = new Date()) {
  const days = Math.floor((now.getTime() - createdAt.getTime()) / 86_400_000);
  return status === "DRAFT" && days >= 1
    ? `Onaylanmadı; henüz onaya gönderilmedi. Taslak oluşturulduğundan beri ${days} gün geçti.`
    : null;
}

export function assertPurchaseRequestDraft(status: string, hasOrder: boolean) {
  if (status !== "DRAFT" || hasOrder) throw new Error("Yalnızca onaya gönderilmemiş taslaklar düzenlenebilir.");
}
