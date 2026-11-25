import { z } from "zod";

export const draftProgressLabels = {
  DRAFT_EDITED: "Taslak düzenlendi",
  SOURCING: "Ürünler temin ediliyor",
  PREPARING: "Hazırlanıyor",
  PREPARED: "Hazırlandı",
  HANDED_TO_CARRIER: "Kargoya teslim edildi",
  SELF_DELIVERY: "Biz sevk edeceğiz",
} as const;
export const draftProgressSchema = z.enum(["DRAFT_EDITED", "SOURCING", "PREPARING", "PREPARED", "HANDED_TO_CARRIER", "SELF_DELIVERY"]);
export type DraftProgress = z.infer<typeof draftProgressSchema>;
export function normalizeDraftProgress(stage?: string | null): DraftProgress {
  const parsed = draftProgressSchema.safeParse(stage);
  return parsed.success ? parsed.data : stage === "READY" ? "PREPARED" : "DRAFT_EDITED";
}
export function canSubmitDraftProgress(stage?: string | null) {
  return stage === "HANDED_TO_CARRIER" || stage === "SELF_DELIVERY";
}
export const draftListCommandSchema = z.discriminatedUnion("command", [
  z.object({ command: z.literal("progress"), id: z.uuid(), version: z.number().int().min(1), stage: draftProgressSchema }),
  z.object({ command: z.literal("submit"), id: z.uuid(), version: z.number().int().min(1) }),
]);
