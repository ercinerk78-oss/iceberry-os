"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseMultiValue, parseTags, replaceCandidateConcepts, replaceCandidateTags } from "@/lib/qualification";
import { candidateSchema, interactionSchema, type ActionState } from "@/lib/validations/candidate";

const stringOrNull = (value?: string) => value || null;
const dateOrNull = (value?: string) => value ? new Date(value) : null;

function refreshCandidate(id?: string) {
  revalidatePath("/candidates");
  revalidatePath("/pipeline");
  revalidatePath("/");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/candidates/${id}`);
}

export async function createCandidate(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = candidateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, message: "Lütfen formdaki hataları düzeltin.", errors: parsed.error.flatten().fieldErrors };
  }

  const user = await requireUser();
  const data = parsed.data;
  const concepts = parseMultiValue(formData.getAll("concepts"));
  const selectedConcepts = concepts.length ? concepts : [data.interestedConcept];
  const tags = parseTags(formData.get("tags"));

  try {
    await prisma.$transaction(async (tx) => {
      const candidate = await tx.franchiseCandidate.create({
        data: {
          ...data,
          interestedConcept: selectedConcepts[0] || data.interestedConcept,
          whatsapp: stringOrNull(data.whatsapp),
          email: stringOrNull(data.email),
          district: stringOrNull(data.district),
          qualificationScore: data.qualificationScore ?? null,
          generalNotes: stringOrNull(data.generalNotes),
          nextFollowUpAt: dateOrNull(data.nextFollowUpAt),
          lastContactAt: dateOrNull(data.lastContactAt),
          lostReason: stringOrNull(data.lostReason),
        },
      });

      await replaceCandidateConcepts(tx, candidate.id, selectedConcepts);
      await replaceCandidateTags(tx, candidate.id, tags);
      await tx.candidateTimelineEvent.create({
        data: {
          candidateId: candidate.id,
          eventType: "CANDIDATE_CREATED",
          title: "Aday oluşturuldu",
          description: `${user.name} tarafından aday kaydı oluşturuldu.`,
          actorName: user.name,
        },
      });
    });

    refreshCandidate();
    return { success: true, message: "Aday başarıyla kaydedildi." };
  } catch {
    return { success: false, message: "Aday kaydedilemedi. Lütfen tekrar deneyin." };
  }
}

export async function updateCandidate(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = candidateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, message: "Lütfen formdaki hataları düzeltin.", errors: parsed.error.flatten().fieldErrors };
  }

  const user = await requireUser();
  const data = parsed.data;
  const concepts = parseMultiValue(formData.getAll("concepts"));
  const selectedConcepts = concepts.length ? concepts : [data.interestedConcept];
  const tags = parseTags(formData.get("tags"));

  try {
    const before = await prisma.franchiseCandidate.findFirst({ where: { id, archivedAt: null } });
    if (!before) return { success: false, message: "Aday bulunamadı." };

    await prisma.$transaction(async (tx) => {
      await tx.franchiseCandidate.update({
        where: { id },
        data: {
          ...data,
          interestedConcept: selectedConcepts[0] || data.interestedConcept,
          whatsapp: stringOrNull(data.whatsapp),
          email: stringOrNull(data.email),
          district: stringOrNull(data.district),
          qualificationScore: data.qualificationScore ?? null,
          generalNotes: stringOrNull(data.generalNotes),
          nextFollowUpAt: dateOrNull(data.nextFollowUpAt),
          lastContactAt: dateOrNull(data.lastContactAt),
          lostReason: stringOrNull(data.lostReason),
        },
      });

      await replaceCandidateConcepts(tx, id, selectedConcepts);
      await replaceCandidateTags(tx, id, tags);
      await tx.candidateTimelineEvent.create({
        data: {
          candidateId: id,
          eventType: "CANDIDATE_UPDATED",
          title: "Aday bilgileri güncellendi",
          description: updateSummary(before, data),
          actorName: user.name,
        },
      });
    });

    refreshCandidate(id);
    return { success: true, message: "Aday bilgileri güncellendi." };
  } catch {
    return { success: false, message: "Aday güncellenemedi." };
  }
}

export async function archiveCandidate(id: string): Promise<ActionState> {
  try {
    await prisma.franchiseCandidate.update({ where: { id }, data: { archivedAt: new Date() } });
    refreshCandidate(id);
    return { success: true, message: "Aday arşivlendi." };
  } catch {
    return { success: false, message: "Aday arşivlenemedi." };
  }
}

export async function createInteraction(candidateId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = interactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, message: "Lütfen görüşme notundaki hataları düzeltin.", errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  try {
    await prisma.$transaction([
      prisma.candidateInteraction.create({
        data: {
          ...data,
          candidateId,
          interactionDate: new Date(data.interactionDate),
          nextAction: stringOrNull(data.nextAction),
          reminderAt: dateOrNull(data.reminderAt),
        },
      }),
      prisma.franchiseCandidate.update({
        where: { id: candidateId },
        data: { lastContactAt: new Date(data.interactionDate), nextFollowUpAt: dateOrNull(data.reminderAt) },
      }),
      prisma.candidateTimelineEvent.create({
        data: {
          candidateId,
          eventType: "INTERACTION_CREATED",
          title: data.title,
          description: data.description,
          eventDate: new Date(data.interactionDate),
        },
      }),
    ]);

    refreshCandidate(candidateId);
    return { success: true, message: "Görüşme notu başarıyla eklendi." };
  } catch {
    return { success: false, message: "Görüşme notu eklenemedi." };
  }
}

function updateSummary(
  before: { status: string; temperature: string; qualificationScore: number | null },
  after: { status: string; temperature: string; qualificationScore?: number },
) {
  const changes = [];
  if (before.status !== after.status) changes.push(`Durum: ${before.status} -> ${after.status}`);
  if (before.temperature !== after.temperature) changes.push(`Sıcaklık: ${before.temperature} -> ${after.temperature}`);
  if (before.qualificationScore !== (after.qualificationScore ?? null)) {
    changes.push(`Puan: ${before.qualificationScore ?? "Puansız"} -> ${after.qualificationScore ?? "Puansız"}`);
  }

  return changes.length ? changes.join(" | ") : "Aday kartı bilgileri güncellendi.";
}
