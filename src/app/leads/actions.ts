"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { leadCategoryLabel, leadStatusLabel } from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import {
  leadActivitySchema,
  leadCategorySchema,
  leadSchema,
  leadStatusSchema,
  type LeadActionState,
} from "@/lib/validations/lead";

const refresh = (id?: string) => {
  revalidatePath("/leads");
  if (id) revalidatePath(`/leads/${id}`);
  revalidatePath("/");
  revalidatePath("/dashboard");
};

export async function createLead(
  _: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const parsed = leadSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      success: false,
      message: "Lütfen formdaki hataları düzeltin.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const data = parsed.data;
    await prisma.lead.create({
      data: {
        ...data,
        email: data.email || null,
        status: "NEW",
        processStatus: "NEW",
        activities: {
          create: {
            type: "CREATE",
            description: `${data.source} kaynağından yeni lead kaydı oluştu.`,
          },
        },
      },
    });
    refresh();

    return { success: true, message: "Lead başarıyla havuza eklendi." };
  } catch {
    return { success: false, message: "Lead kaydedilemedi." };
  }
}

export async function addLeadActivity(
  leadId: string,
  _: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const user = await requireUser();
  const parsed = leadActivitySchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      success: false,
      message: "Aktivite bilgilerini kontrol edin.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await prisma.leadActivity.create({
      data: {
        leadId,
        type: parsed.data.type,
        description: `${parsed.data.description} (${user.name})`,
      },
    });
    await prisma.lead.update({ where: { id: leadId }, data: { lastContactAt: new Date() } });
    refresh(leadId);

    return { success: true, message: "Aktivite kaydedildi." };
  } catch {
    return { success: false, message: "Aktivite kaydedilemedi." };
  }
}

export async function changeLeadStatus(leadId: string, status: string) {
  const user = await requireUser();
  const parsed = leadStatusSchema.safeParse(status);

  if (!parsed.success) return { success: false, message: "Geçersiz lead durumu." };

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { status: true, processStatus: true },
    });
    if (!lead) return { success: false, message: "Lead bulunamadı." };

    await prisma.$transaction([
      prisma.lead.update({
        where: { id: leadId },
        data: { status: parsed.data, processStatus: parsed.data },
      }),
      prisma.leadActivity.create({
        data: {
          leadId,
          type: "STATUS_CHANGE",
          description: `${user.name} lead durumunu ${leadStatusLabel(lead.processStatus || lead.status)} -> ${leadStatusLabel(parsed.data)} olarak değiştirdi.`,
        },
      }),
    ]);
    refresh(leadId);

    return { success: true, message: "Lead durumu güncellendi." };
  } catch {
    return { success: false, message: "Lead durumu güncellenemedi." };
  }
}

export async function changeLeadCategory(leadId: string, category: string) {
  const user = await requireUser();
  const parsed = leadCategorySchema.safeParse(category);

  if (!parsed.success) return { success: false, message: "Geçersiz lead kategorisi." };

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { leadCategory: true },
    });
    if (!lead) return { success: false, message: "Lead bulunamadı." };

    await prisma.$transaction([
      prisma.lead.update({ where: { id: leadId }, data: { leadCategory: parsed.data } }),
      prisma.leadActivity.create({
        data: {
          leadId,
          type: "CATEGORY_CHANGE",
          description: `${user.name} lead kategorisini ${leadCategoryLabel(lead.leadCategory)} -> ${leadCategoryLabel(parsed.data)} olarak değiştirdi.`,
        },
      }),
    ]);
    refresh(leadId);

    return { success: true, message: "Lead kategorisi güncellendi." };
  } catch {
    return { success: false, message: "Lead kategorisi güncellenemedi." };
  }
}

export async function convertLead(leadId: string) {
  const user = await requireUser();

  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { success: false, message: "Lead bulunamadı." };
    if (lead.convertedCandidateId) {
      return {
        success: true,
        message: "Lead daha önce adaya dönüştürülmüş.",
        candidateId: lead.convertedCandidateId,
      };
    }

    const candidate = await prisma.$transaction(async (tx) => {
      const created = await tx.franchiseCandidate.create({
        data: {
          fullName: lead.fullName,
          phone: lead.phone,
          whatsapp: lead.source === "WhatsApp" ? lead.phone : null,
          email: lead.email,
          city: lead.city,
          country: "Türkiye",
          investmentBudget: lead.investmentBudget || "Belirtilmedi",
          currency: "TRY",
          interestedConcept: lead.requestedConcept,
          source: lead.source,
          status: "Yeni Lead",
          temperature: "Ilık",
          assignedUserId: lead.assignedUserId || user.name,
          generalNotes: "Lead Havuzu üzerinden franchise adayına dönüştürüldü.",
        },
      });
      await tx.lead.update({
        where: { id: leadId },
        data: {
          status: "CONVERTED_TO_CANDIDATE",
          processStatus: "CONVERTED_TO_CANDIDATE",
          convertedCandidateId: created.id,
        },
      });
      await tx.leadActivity.create({
        data: {
          leadId,
          type: "LEAD_CONVERTED",
          description: `${user.name} lead kaydını franchise adayına dönüştürdü.`,
        },
      });

      return created;
    });
    refresh(leadId);
    revalidatePath("/candidates");
    revalidatePath("/pipeline");

    return {
      success: true,
      message: "Lead başarıyla franchise adayına dönüştürüldü.",
      candidateId: candidate.id,
    };
  } catch {
    return { success: false, message: "Lead adaya dönüştürülemedi." };
  }
}
