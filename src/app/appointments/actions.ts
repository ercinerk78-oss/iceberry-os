"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  appointmentTypeLabel,
  combineAppointmentDate,
} from "@/lib/appointments";
import { requirePermission, requireUser } from "@/lib/auth";
import { LEAD_CATEGORIES } from "@/lib/leads";
import { prisma } from "@/lib/prisma";

const createAppointmentSchema = z.object({
  leadId: z.string().min(1),
  appointmentDate: z.string().min(1),
  appointmentTime: z.string().min(1),
  appointmentType: z.enum(APPOINTMENT_TYPES),
  assignedUserId: z.string().optional(),
  title: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

const completeAppointmentSchema = z.object({
  notes: z.string().trim().optional(),
  outcome: z.string().trim().min(2, "Görüşme sonucu zorunludur."),
  leadCategory: z.enum(LEAD_CATEGORIES),
  nextAction: z.string().trim().optional(),
  nextFollowUpAt: z.string().optional(),
  convertToCandidate: z.string().optional(),
});

const rescheduleSchema = z.object({
  appointmentDate: z.string().min(1),
  appointmentTime: z.string().min(1),
});

export type AppointmentActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

const initialError = { success: false, message: "Form bilgilerini kontrol edin." };

function refresh(leadId?: string) {
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/leads");
  revalidatePath("/appointments");
  revalidatePath("/tasks");
  if (leadId) revalidatePath(`/leads/${leadId}`);
}

export async function createLeadAppointment(
  _: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  await requirePermission("appointments");
  const user = await requireUser();
  const parsed = createAppointmentSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) return { ...initialError, errors: parsed.error.flatten().fieldErrors };

  try {
    const data = parsed.data;
    const appointmentDate = combineAppointmentDate(data.appointmentDate, data.appointmentTime);
    const lead = await prisma.lead.findUnique({
      where: { id: data.leadId },
      select: { id: true, fullName: true },
    });

    if (!lead) return { success: false, message: "Lead bulunamadı." };

    const title = data.title || `${lead.fullName} ile franchise görüşmesi`;
    const assignedUserId = data.assignedUserId || user.name;
    const activityText = new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(appointmentDate);

    await prisma.$transaction(async (tx) => {
      await tx.leadAppointment.create({
        data: {
          leadId: lead.id,
          appointmentDate,
          appointmentTime: data.appointmentTime,
          appointmentType: data.appointmentType,
          assignedUserId,
          createdByUserId: user.id,
          status: "WAITING",
          title,
          notes: data.notes || null,
        },
      });
      await tx.leadTask.create({
        data: {
          leadId: lead.id,
          title,
          description: data.notes || "Randevu için otomatik oluşturulan takip görevi.",
          dueDate: appointmentDate,
          priority: "Yüksek",
          status: "Açık",
          assignedUserId,
        },
      });
      await tx.lead.update({
        where: { id: lead.id },
        data: { status: "WAITING_FOR_APPOINTMENT", nextFollowUpAt: appointmentDate },
      });
      await tx.leadActivity.create({
        data: {
          leadId: lead.id,
          type: "Randevu oluşturuldu",
          description: `${activityText} için ${appointmentTypeLabel(data.appointmentType).toLocaleLowerCase("tr-TR")} görüşme randevusu oluşturuldu.`,
        },
      });
    });

    refresh(lead.id);
    return { success: true, message: "Randevu oluşturuldu ve otomatik görev atandı." };
  } catch (error) {
    console.error("Lead appointment create failed", error);
    return { success: false, message: "Randevu oluşturulamadı." };
  }
}

export async function createLeadAppointmentForm(formData: FormData) {
  await createLeadAppointment({ success: false, message: "" }, formData);
}

export async function completeLeadAppointment(
  appointmentId: string,
  _: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  await requirePermission("appointments");
  const parsed = completeAppointmentSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) return { ...initialError, errors: parsed.error.flatten().fieldErrors };

  try {
    const appointment = await prisma.leadAppointment.findUnique({
      where: { id: appointmentId },
      include: { lead: { select: { id: true, convertedCandidateId: true } } },
    });

    if (!appointment) return { success: false, message: "Randevu bulunamadı." };

    const nextFollowUpAt = parsed.data.nextFollowUpAt ? new Date(parsed.data.nextFollowUpAt) : null;
    await prisma.$transaction(async (tx) => {
      await tx.leadAppointment.update({
        where: { id: appointmentId },
        data: {
          status: "COMPLETED",
          notes: parsed.data.notes || appointment.notes,
          outcome: [parsed.data.outcome, parsed.data.nextAction ? `Sonraki aksiyon: ${parsed.data.nextAction}` : ""]
            .filter(Boolean)
            .join(" "),
          completedAt: new Date(),
        },
      });
      await tx.lead.update({
        where: { id: appointment.leadId },
        data: {
          status: parsed.data.convertToCandidate ? "CONVERTED_TO_CANDIDATE" : "MEETING_COMPLETED",
          leadCategory: parsed.data.leadCategory,
          nextFollowUpAt,
        },
      });
      await tx.leadTask.updateMany({
        where: {
          leadId: appointment.leadId,
          dueDate: appointment.appointmentDate,
          status: { in: ["Açık", "Devam Ediyor"] },
        },
        data: { status: "Tamamlandı", completedAt: new Date() },
      });
      await tx.leadActivity.create({
        data: {
          leadId: appointment.leadId,
          type: "Randevu tamamlandı",
          description: `Görüşme tamamlandı. Sonuç: ${parsed.data.outcome}`,
        },
      });
    });

    refresh(appointment.leadId);
    return { success: true, message: "Randevu sonucu kaydedildi." };
  } catch (error) {
    console.error("Lead appointment complete failed", error);
    return { success: false, message: "Randevu sonucu kaydedilemedi." };
  }
}

export async function completeLeadAppointmentForm(appointmentId: string, formData: FormData) {
  await completeLeadAppointment(appointmentId, { success: false, message: "" }, formData);
}

export async function changeLeadAppointmentStatus(appointmentId: string, status: string) {
  await requirePermission("appointments");
  const parsed = z.enum(APPOINTMENT_STATUSES).safeParse(status);

  if (!parsed.success) return { success: false, message: "Geçersiz randevu durumu." };

  try {
    const appointment = await prisma.leadAppointment.update({
      where: { id: appointmentId },
      data: {
        status: parsed.data,
        cancelledAt: parsed.data === "CANCELLED" ? new Date() : null,
      },
      select: { leadId: true },
    });
    await prisma.leadActivity.create({
      data: {
        leadId: appointment.leadId,
        type: "Randevu durumu",
        description: `Randevu durumu ${parsed.data} olarak güncellendi.`,
      },
    });
    refresh(appointment.leadId);

    return { success: true, message: "Randevu durumu güncellendi." };
  } catch {
    return { success: false, message: "Randevu durumu güncellenemedi." };
  }
}

export async function changeLeadAppointmentStatusForm(appointmentId: string, status: string) {
  await changeLeadAppointmentStatus(appointmentId, status);
}

export async function rescheduleLeadAppointment(appointmentId: string, formData: FormData) {
  await requirePermission("appointments");
  const parsed = rescheduleSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) return;

  const appointmentDate = combineAppointmentDate(parsed.data.appointmentDate, parsed.data.appointmentTime);
  const appointment = await prisma.leadAppointment.update({
    where: { id: appointmentId },
    data: {
      appointmentDate,
      appointmentTime: parsed.data.appointmentTime,
      status: "RESCHEDULED",
    },
    select: { leadId: true },
  });
  await prisma.lead.update({
    where: { id: appointment.leadId },
    data: { status: "WAITING_FOR_APPOINTMENT", nextFollowUpAt: appointmentDate },
  });
  await prisma.leadActivity.create({
    data: {
      leadId: appointment.leadId,
      type: "Randevu ertelendi",
      description: "Randevu yeni tarihe ertelendi.",
    },
  });
  refresh(appointment.leadId);
}
