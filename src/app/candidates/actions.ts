"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { candidateSchema, interactionSchema, type ActionState } from "@/lib/validations/candidate";

const stringOrNull = (value?: string) => value || null;
const dateOrNull = (value?: string) => value ? new Date(value) : null;

export async function createCandidate(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = candidateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: "Lütfen formdaki hataları düzeltin.", errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  try {
    await prisma.franchiseCandidate.create({ data: { ...d, whatsapp: stringOrNull(d.whatsapp), email: stringOrNull(d.email), district: stringOrNull(d.district), generalNotes: stringOrNull(d.generalNotes), nextFollowUpAt: dateOrNull(d.nextFollowUpAt), lastContactAt: dateOrNull(d.lastContactAt), lostReason: stringOrNull(d.lostReason) } });
    revalidatePath("/candidates");
    return { success: true, message: "Aday başarıyla kaydedildi." };
  } catch { return { success: false, message: "Aday kaydedilemedi. Lütfen tekrar deneyin." }; }
}

export async function updateCandidate(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = candidateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: "Lütfen formdaki hataları düzeltin.", errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  try {
    await prisma.franchiseCandidate.update({ where: { id, archivedAt: null }, data: { ...d, whatsapp: stringOrNull(d.whatsapp), email: stringOrNull(d.email), district: stringOrNull(d.district), generalNotes: stringOrNull(d.generalNotes), nextFollowUpAt: dateOrNull(d.nextFollowUpAt), lastContactAt: dateOrNull(d.lastContactAt), lostReason: stringOrNull(d.lostReason) } });
    revalidatePath("/candidates"); revalidatePath(`/candidates/${id}`);
    return { success: true, message: "Aday bilgileri güncellendi." };
  } catch { return { success: false, message: "Aday güncellenemedi." }; }
}

export async function archiveCandidate(id: string): Promise<ActionState> {
  try {
    await prisma.franchiseCandidate.update({ where: { id }, data: { archivedAt: new Date() } });
    revalidatePath("/candidates");
    return { success: true, message: "Aday arşivlendi." };
  } catch { return { success: false, message: "Aday arşivlenemedi." }; }
}

export async function createInteraction(candidateId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = interactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: "Lütfen görüşme notundaki hataları düzeltin.", errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  try {
    await prisma.$transaction([
      prisma.candidateInteraction.create({ data: { ...d, candidateId, interactionDate: new Date(d.interactionDate), nextAction: stringOrNull(d.nextAction), reminderAt: dateOrNull(d.reminderAt) } }),
      prisma.franchiseCandidate.update({ where: { id: candidateId }, data: { lastContactAt: new Date(d.interactionDate), nextFollowUpAt: dateOrNull(d.reminderAt) } }),
    ]);
    revalidatePath(`/candidates/${candidateId}`); revalidatePath("/candidates");
    return { success: true, message: "Görüşme notu başarıyla eklendi." };
  } catch { return { success: false, message: "Görüşme notu eklenemedi." }; }
}
