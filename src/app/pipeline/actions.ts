"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { activeLeadWhere } from "@/lib/active-records";
import { requireUser } from "@/lib/auth";
import { LEAD_PIPELINE_STAGES, LEAD_STAGE_STATUS, PIPELINE_STAGES } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";

const statusSchema = z.enum(PIPELINE_STAGES);
const itemTypeSchema = z.enum(["candidate", "lead"]);

function refreshPipeline(candidateId?: string, leadId?: string) {
  revalidatePath("/pipeline");
  revalidatePath("/candidates");
  revalidatePath("/");
  revalidatePath("/dashboard");
  if (candidateId) revalidatePath(`/candidates/${candidateId}`);
  if (leadId) revalidatePath(`/leads/${leadId}`);
}

export async function movePipelineItem(itemType: string, itemId: string, nextStage: string) {
  const parsedType = itemTypeSchema.safeParse(itemType);
  const parsedStage = statusSchema.safeParse(nextStage);

  if (!parsedType.success || !parsedStage.success) {
    return { success: false, message: "Geçersiz satış aşaması." };
  }

  return parsedType.data === "lead"
    ? moveLead(itemId, parsedStage.data)
    : moveCandidate(itemId, parsedStage.data);
}

export async function moveCandidate(candidateId: string, nextStatus: string) {
  const parsed = statusSchema.safeParse(nextStatus);
  if (!parsed.success) return { success: false, message: "Geçersiz pipeline aşaması." };

  try {
    const candidate = await prisma.franchiseCandidate.findFirst({
      where: { id: candidateId, archivedAt: null },
      select: { status: true },
    });
    if (!candidate) return { success: false, message: "Aday bulunamadı." };
    if (candidate.status === parsed.data) return { success: true, message: "Aday zaten bu aşamada." };

    await prisma.$transaction([
      prisma.franchiseCandidate.update({ where: { id: candidateId }, data: { status: parsed.data } }),
      prisma.candidateInteraction.create({
        data: {
          candidateId,
          interactionType: "Sistem Aktivitesi",
          title: "Pipeline aşaması güncellendi",
          description: `Aday, ${candidate.status} aşamasından ${parsed.data} aşamasına taşındı.`,
          interactionDate: new Date(),
        },
      }),
    ]);
    refreshPipeline(candidateId);

    return { success: true, message: `Aday "${parsed.data}" aşamasına taşındı.` };
  } catch {
    return { success: false, message: "Aday taşınamadı. Kart eski aşamasına döndürüldü." };
  }
}

async function moveLead(leadId: string, nextStage: (typeof PIPELINE_STAGES)[number]) {
  const user = await requireUser();
  if (!(LEAD_PIPELINE_STAGES as readonly string[]).includes(nextStage)) {
    return { success: false, message: "Lead kaydı bu aşamaya taşınmadan önce franchise adayına dönüştürülmelidir." };
  }

  const nextStatus = LEAD_STAGE_STATUS[nextStage];

  try {
    const lead = await prisma.lead.findFirst({
      where: activeLeadWhere({ id: leadId }),
      select: { status: true, processStatus: true, fullName: true },
    });
    if (!lead) return { success: false, message: "Lead bulunamadı veya daha önce adaya dönüştürüldü." };
    if ((lead.processStatus || lead.status) === nextStatus) return { success: true, message: "Lead zaten bu aşamada." };

    await prisma.$transaction([
      prisma.lead.update({
        where: { id: leadId },
        data: { status: nextStatus, processStatus: nextStatus },
      }),
      prisma.leadActivity.create({
        data: {
          leadId,
          type: "PIPELINE_STAGE_CHANGE",
          description: `${user.name} lead kaydını ${lead.processStatus || lead.status} aşamasından ${nextStage} aşamasına taşıdı.`,
        },
      }),
    ]);
    refreshPipeline(undefined, leadId);

    return { success: true, message: `${lead.fullName} "${nextStage}" aşamasına taşındı.` };
  } catch {
    return { success: false, message: "Lead taşınamadı. Kart eski aşamasına döndürüldü." };
  }
}
