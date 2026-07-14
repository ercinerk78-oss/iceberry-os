"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { TASK_STATUSES } from "@/lib/pipeline";
import { taskSchema, type TaskActionState } from "@/lib/validations/task";

const nullable = (value?: string) => value || null;
const refresh = (candidateId: string) => { revalidatePath(`/candidates/${candidateId}`); revalidatePath("/tasks"); revalidatePath("/pipeline"); revalidatePath("/"); };

export async function createTask(candidateId: string, _: TaskActionState, formData: FormData): Promise<TaskActionState> {
  const parsed=taskSchema.safeParse(Object.fromEntries(formData)); if(!parsed.success)return{success:false,message:"Lütfen görev formundaki hataları düzeltin.",errors:parsed.error.flatten().fieldErrors};
  try { const d=parsed.data; await prisma.candidateTask.create({data:{...d,candidateId,description:nullable(d.description),dueDate:new Date(d.dueDate),completedAt:d.status==="Tamamlandı"?new Date():null}}); refresh(candidateId); return{success:true,message:"Görev başarıyla oluşturuldu."}; } catch{return{success:false,message:"Görev oluşturulamadı."};}
}
export async function updateTask(taskId:string, _:TaskActionState, formData:FormData):Promise<TaskActionState>{const parsed=taskSchema.safeParse(Object.fromEntries(formData));if(!parsed.success)return{success:false,message:"Lütfen görev formundaki hataları düzeltin.",errors:parsed.error.flatten().fieldErrors};try{const current=await prisma.candidateTask.findUnique({where:{id:taskId},select:{candidateId:true}});if(!current)return{success:false,message:"Görev bulunamadı."};const d=parsed.data;await prisma.candidateTask.update({where:{id:taskId},data:{...d,description:nullable(d.description),dueDate:new Date(d.dueDate),completedAt:d.status==="Tamamlandı"?new Date():null}});refresh(current.candidateId);return{success:true,message:"Görev güncellendi."};}catch{return{success:false,message:"Görev güncellenemedi."};}}
export async function changeTaskStatus(taskId:string,status:string){const parsed=z.enum(TASK_STATUSES).safeParse(status);if(!parsed.success)return{success:false,message:"Geçersiz görev durumu."};try{const task=await prisma.candidateTask.update({where:{id:taskId},data:{status:parsed.data,completedAt:parsed.data==="Tamamlandı"?new Date():null},select:{candidateId:true}});refresh(task.candidateId);return{success:true,message:parsed.data==="Tamamlandı"?"Görev tamamlandı.":parsed.data==="İptal Edildi"?"Görev iptal edildi.":"Görev durumu güncellendi."};}catch{return{success:false,message:"Görev durumu güncellenemedi."};}}
