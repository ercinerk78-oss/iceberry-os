"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { convertLead } from "@/app/leads/actions";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  appointmentTypeLabel,
  combineAppointmentDate,
} from "@/lib/appointments";
import { requirePermission, requireUser } from "@/lib/auth";
import { LEAD_CATEGORIES, leadCategoryLabel } from "@/lib/leads";
import { prisma } from "@/lib/prisma";

const createAppointmentSchema = z.object({
  leadId: z.string().min(1),
  appointmentDate: z.string().min(1),
  appointmentTime: z.string().min(1),
  endTime: z.string().optional(),
  appointmentType: z.enum(APPOINTMENT_TYPES),
  assignedUserId: z.string().optional(),
  title: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  location: z.string().trim().optional(),
  meetingLink: z.string().trim().optional(),
});

const completeAppointmentSchema = z.object({
  notes: z.string().trim().optional(),
  outcome: z.string().trim().min(2, "Görüşme sonucu zorunludur."),
  leadCategory: z.enum(LEAD_CATEGORIES).optional().or(z.literal("")),
  nextAction: z.string().trim().optional(),
  nextFollowUpAt: z.string().optional(),
  convertToCandidate: z.string().optional(),
});

const rescheduleSchema = z.object({
  appointmentDate: z.string().min(1),
  appointmentTime: z.string().min(1),
  rescheduleReason: z.string().trim().optional(),
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

function formattedDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
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
    const startDateTime = combineAppointmentDate(data.appointmentDate, data.appointmentTime);
    const endDateTime = data.endTime ? combineAppointmentDate(data.appointmentDate, data.endTime) : null;
    const lead = await prisma.lead.findUnique({
      where: { id: data.leadId },
      select: { id: true, fullName: true },
    });

    if (!lead) return { success: false, message: "Lead bulunamadı." };

    const title = data.title || `${lead.fullName} ile franchise görüşmesi`;
    const assignedUserId = data.assignedUserId || user.name;
    const detailParts = [
      `Randevu tarihi: ${formattedDate(startDateTime)}`,
      `Görüşme tipi: ${appointmentTypeLabel(data.appointmentType)}`,
      data.location ? `Lokasyon: ${data.location}` : "",
      data.meetingLink ? `Toplantı linki: ${data.meetingLink}` : "",
    ].filter(Boolean);

    await prisma.$transaction(async (tx) => {
      await tx.leadAppointment.create({
        data: {
          leadId: lead.id,
          appointmentDate: startDateTime,
          appointmentTime: data.appointmentTime,
          appointmentType: data.appointmentType,
          type: data.appointmentType,
          startDateTime,
          endDateTime,
          assignedUserId,
          createdByUserId: user.id,
          createdById: user.id,
          status: "SCHEDULED",
          title,
          description: data.notes || null,
          location: data.location || null,
          meetingLink: data.meetingLink || null,
          notes: data.notes || null,
        },
      });
      await tx.leadTask.create({
        data: {
          leadId: lead.id,
          title,
          description: detailParts.join("\n"),
          dueDate: startDateTime,
          priority: "Yüksek",
          status: "Açık",
          assignedUserId,
        },
      });
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: "WAITING_FOR_APPOINTMENT",
          processStatus: "WAITING_FOR_APPOINTMENT",
          nextFollowUpAt: startDateTime,
          assignedUserId,
        },
      });
      await tx.leadActivity.create({
        data: {
          leadId: lead.id,
          type: "APPOINTMENT_CREATED",
          description: `${user.name}, ${formattedDate(startDateTime)} için ${appointmentTypeLabel(data.appointmentType).toLocaleLowerCase("tr-TR")} görüşme randevusu oluşturdu.`,
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
  const user = await requireUser();
  const parsed = completeAppointmentSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) return { ...initialError, errors: parsed.error.flatten().fieldErrors };

  try {
    const appointment = await prisma.leadAppointment.findUnique({
      where: { id: appointmentId },
      include: { lead: { select: { id: true, convertedCandidateId: true } } },
    });

    if (!appointment) return { success: false, message: "Randevu bulunamadı." };

    const nextFollowUpAt = parsed.data.nextFollowUpAt ? new Date(parsed.data.nextFollowUpAt) : null;
    const category = parsed.data.leadCategory || undefined;
    await prisma.$transaction(async (tx) => {
      await tx.leadAppointment.update({
        where: { id: appointmentId },
        data: {
          status: "COMPLETED",
          notes: parsed.data.notes || appointment.notes,
          outcome: [parsed.data.outcome, parsed.data.nextAction ? `Sonraki aksiyon: ${parsed.data.nextAction}` : ""]
            .filter(Boolean)
            .join(" "),
          result: parsed.data.outcome,
          completedAt: new Date(),
        },
      });
      await tx.lead.update({
        where: { id: appointment.leadId },
        data: {
          status: "MEETING_COMPLETED",
          processStatus: "MEETING_COMPLETED",
          ...(category ? { leadCategory: category } : {}),
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
          type: "APPOINTMENT_COMPLETED",
          description: `${user.name} görüşmeyi tamamladı. Sonuç: ${parsed.data.outcome}${category ? ` Kategori: ${leadCategoryLabel(category)}.` : ""}`,
        },
      });
    });

    if (parsed.data.convertToCandidate && !appointment.lead.convertedCandidateId) {
      await convertLead(appointment.leadId);
    }

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

export async function changeLeadAppointmentStatus(appointmentId: string, status: string, formData?: FormData) {
  await requirePermission("appointments");
  const user = await requireUser();
  const parsed = z.enum(APPOINTMENT_STATUSES).safeParse(status);

  if (!parsed.success) return { success: false, message: "Geçersiz randevu durumu." };

  try {
    const reason = String(formData?.get("reason") || "");
    const appointment = await prisma.leadAppointment.update({
      where: { id: appointmentId },
      data: {
        status: parsed.data,
        cancelledAt: parsed.data === "CANCELLED" ? new Date() : null,
        cancellationReason: parsed.data === "CANCELLED" ? reason || null : undefined,
      },
      select: { leadId: true },
    });
    await prisma.leadActivity.create({
      data: {
        leadId: appointment.leadId,
        type: parsed.data === "NO_SHOW" ? "APPOINTMENT_NO_SHOW" : parsed.data === "CANCELLED" ? "APPOINTMENT_CANCELLED" : "APPOINTMENT_UPDATED",
        description: `${user.name} randevu durumunu ${parsed.data} olarak güncelledi.${reason ? ` Neden: ${reason}` : ""}`,
      },
    });
    refresh(appointment.leadId);

    return { success: true, message: "Randevu durumu güncellendi." };
  } catch {
    return { success: false, message: "Randevu durumu güncellenemedi." };
  }
}

export async function changeLeadAppointmentStatusForm(appointmentId: string, status: string, formData: FormData) {
  await changeLeadAppointmentStatus(appointmentId, status, formData);
}

export async function rescheduleLeadAppointment(appointmentId: string, formData: FormData) {
  await requirePermission("appointments");
  const user = await requireUser();
  const parsed = rescheduleSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) return;

  const startDateTime = combineAppointmentDate(parsed.data.appointmentDate, parsed.data.appointmentTime);
  const current = await prisma.leadAppointment.findUnique({ where: { id: appointmentId } });
  if (!current) return;

  await prisma.$transaction(async (tx) => {
    const appointment = await tx.leadAppointment.update({
      where: { id: appointmentId },
      data: {
        previousAppointmentDate: current.appointmentDate,
        appointmentDate: startDateTime,
        startDateTime,
        appointmentTime: parsed.data.appointmentTime,
        status: "RESCHEDULED",
        rescheduleReason: parsed.data.rescheduleReason || null,
      },
      select: { leadId: true },
    });
    await tx.lead.update({
      where: { id: appointment.leadId },
      data: {
        status: "WAITING_FOR_APPOINTMENT",
        processStatus: "WAITING_FOR_APPOINTMENT",
        nextFollowUpAt: startDateTime,
      },
    });
    await tx.leadActivity.create({
      data: {
        leadId: appointment.leadId,
        type: "APPOINTMENT_RESCHEDULED",
        description: `${user.name} randevuyu ${formattedDate(current.appointmentDate)} tarihinden ${formattedDate(startDateTime)} tarihine erteledi.${parsed.data.rescheduleReason ? ` Neden: ${parsed.data.rescheduleReason}` : ""}`,
      },
    });
  });
  refresh(current.leadId);
}
