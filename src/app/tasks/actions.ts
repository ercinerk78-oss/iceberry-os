"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { TASK_STATUSES } from "@/lib/pipeline";
import { taskSchema, type TaskActionState } from "@/lib/validations/task";

const nullable = (value?: string) => value || null;

function refresh(candidateId: string) {
  revalidatePath(`/candidates/${candidateId}`);
  revalidatePath("/tasks");
  revalidatePath("/pipeline");
  revalidatePath("/");
}

export async function createTask(candidateId: string, _: TaskActionState, formData: FormData): Promise<TaskActionState> {
  const parsed = taskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      success: false,
      message: "Lütfen görev formundaki hataları düzeltin.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const data = parsed.data;
    await prisma.candidateTask.create({
      data: {
        ...data,
        candidateId,
        description: nullable(data.description),
        dueDate: new Date(data.dueDate),
        completedAt: data.status === "Tamamlandı" ? new Date() : null,
      },
    });
    refresh(candidateId);
    return { success: true, message: "Görev başarıyla oluşturuldu." };
  } catch {
    return { success: false, message: "Görev oluşturulamadı." };
  }
}

export async function updateTask(taskId: string, _: TaskActionState, formData: FormData): Promise<TaskActionState> {
  const parsed = taskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      success: false,
      message: "Lütfen görev formundaki hataları düzeltin.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const current = await prisma.candidateTask.findUnique({ where: { id: taskId }, select: { candidateId: true } });
    if (!current) return { success: false, message: "Görev bulunamadı." };

    const data = parsed.data;
    await prisma.candidateTask.update({
      where: { id: taskId },
      data: {
        ...data,
        description: nullable(data.description),
        dueDate: new Date(data.dueDate),
        completedAt: data.status === "Tamamlandı" ? new Date() : null,
      },
    });
    refresh(current.candidateId);
    return { success: true, message: "Görev güncellendi." };
  } catch {
    return { success: false, message: "Görev güncellenemedi." };
  }
}

export async function changeTaskStatus(taskId: string, status: string) {
  const parsed = z.enum(TASK_STATUSES).safeParse(status);
  if (!parsed.success) return { success: false, message: "Geçersiz görev durumu." };

  try {
    const task = await prisma.candidateTask.update({
      where: { id: taskId },
      data: {
        status: parsed.data,
        completedAt: parsed.data === "Tamamlandı" ? new Date() : null,
      },
      select: { candidateId: true },
    });
    refresh(task.candidateId);

    if (parsed.data === "Tamamlandı") return { success: true, message: "Görev tamamlandı." };
    if (parsed.data === "İptal Edildi") return { success: true, message: "Görev iptal edildi." };
    return { success: true, message: "Görev durumu güncellendi." };
  } catch {
    return { success: false, message: "Görev durumu güncellenemedi." };
  }
}

export async function completeTaskForm(taskId: string, _formData: FormData) {
  void _formData;
  await changeTaskStatus(taskId, "Tamamlandı");
}
