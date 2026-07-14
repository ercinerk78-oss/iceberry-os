import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/pipeline";

export const taskSchema = z.object({
  title: z.string().trim().min(2, "Görev başlığı en az 2 karakter olmalıdır."),
  description: z.string().trim().max(1000, "Açıklama çok uzun.").optional().or(z.literal("")),
  dueDate: z.string().min(1, "Bitiş tarihi zorunludur."),
  priority: z.enum(TASK_PRIORITIES),
  status: z.enum(TASK_STATUSES),
  assignedUserId: z.string().trim().min(2, "Sorumlu kişi seçin."),
});

export type TaskActionState = { success: boolean; message: string; errors?: Record<string,string[]> };
