"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PIPELINE_STAGES } from "@/lib/pipeline";

const statusSchema = z.enum(PIPELINE_STAGES);

export async function moveCandidate(candidateId: string, nextStatus: string) {
  const parsed = statusSchema.safeParse(nextStatus);
  if (!parsed.success) return { success: false, message: "Geçersiz pipeline aşaması." };
  try {
    const candidate = await prisma.franchiseCandidate.findFirst({ where: { id: candidateId, archivedAt: null }, select: { status: true } });
    if (!candidate) return { success: false, message: "Aday bulunamadı." };
    if (candidate.status === parsed.data) return { success: true, message: "Aday zaten bu aşamada." };
    await prisma.$transaction([
      prisma.franchiseCandidate.update({ where: { id: candidateId }, data: { status: parsed.data } }),
      prisma.candidateInteraction.create({ data: { candidateId, interactionType: "Sistem Aktivitesi", title: "Pipeline aşaması güncellendi", description: `Aday, ${candidate.status} aşamasından ${parsed.data} aşamasına taşındı.`, interactionDate: new Date() } }),
    ]);
    revalidatePath("/pipeline"); revalidatePath(`/candidates/${candidateId}`); revalidatePath("/");
    return { success: true, message: `Aday “${parsed.data}” aşamasına taşındı.` };
  } catch { return { success: false, message: "Aday taşınamadı. Kart eski aşamasına döndürüldü." }; }
}
