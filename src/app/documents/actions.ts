"use server";

import path from "node:path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { DocumentType } from "@/lib/documents";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { validateDocumentFiles } from "@/lib/validations/document";
import { requirePermission } from "@/lib/auth";

export type DocumentActionState={success:boolean;message:string};
const schema=z.object({version:z.string().trim().min(1,"Versiyon zorunludur.").max(30,"Versiyon en fazla 30 karakter olabilir."),description:z.string().trim().max(500,"Açıklama en fazla 500 karakter olabilir.").optional().or(z.literal(""))});

function refresh(candidateId?:string|null){if(candidateId)revalidatePath(`/candidates/${candidateId}`);revalidatePath("/documents")}

export async function uploadCandidateDocuments(candidateId:string,requestedType:DocumentType,_state:DocumentActionState,formData:FormData):Promise<DocumentActionState>{
  await requirePermission("documents");
  const candidate=await prisma.franchiseCandidate.findFirst({where:{id:candidateId,archivedAt:null},select:{id:true}});
  if(!candidate)return{success:false,message:"Franchise adayı bulunamadı."};
  if(!["LOCATION_ANALYSIS_PDF","LOCATION_ANALYSIS_VISUAL"].includes(requestedType))return{success:false,message:"Geçersiz doküman türü."};
  const parsed=schema.safeParse({version:formData.get("version"),description:formData.get("description")});
  if(!parsed.success)return{success:false,message:parsed.error.issues[0]?.message??"Form bilgilerini kontrol edin."};
  const files=formData.getAll("files").filter((value):value is File=>value instanceof File&&value.size>0);
  const fileError=validateDocumentFiles(files,requestedType);if(fileError)return{success:false,message:fileError};
  const stored:{file:File;fileName:string;filePath:string}[]=[];
  try{
    for(const file of files){const saved=await storage.save(file);stored.push({file,...saved})}
    await prisma.$transaction(stored.map(({file,fileName,filePath})=>prisma.document.create({data:{fileName,originalFileName:path.basename(file.name),filePath,mimeType:file.type,fileSize:file.size,documentType:requestedType,version:parsed.data.version,description:parsed.data.description||null,candidateId,uploadedBy:"Sistem Kullanıcısı"}})));
  }catch{await Promise.all(stored.map(file=>storage.remove(file.filePath)));return{success:false,message:"Dosyalar yüklenemedi. Lütfen tekrar deneyin."}}
  refresh(candidateId);return{success:true,message:`${files.length} dosya başarıyla yüklendi.`};
}

export async function uploadRelatedDocuments(relation:"franchisee"|"branch"|"opening",relationId:string,requestedType:DocumentType,_state:DocumentActionState,formData:FormData):Promise<DocumentActionState>{
  await requirePermission("documents");
  const allowed:DocumentType[]=["FRANCHISE_AGREEMENT","LEASE_DOCUMENT","COMPANY_DOCUMENT","BRANCH_DEVELOPMENT_STRATEGY","ARCHITECTURAL_PROJECT","MALL_APPROVAL","MUNICIPAL_DOCUMENT","PRODUCTION_FILE","SHIPMENT_DOCUMENT","TRAINING_DOCUMENT","OPENING_VISUAL","OTHER"];
  if(!allowed.includes(requestedType))return{success:false,message:"Geçersiz doküman türü."};
  const exists=relation==="franchisee"?await prisma.franchisee.findFirst({where:{id:relationId,archivedAt:null}}):relation==="branch"?await prisma.branch.findFirst({where:{id:relationId,archivedAt:null}}):await prisma.branchOpening.findFirst({where:{id:relationId,archivedAt:null}});
  if(!exists)return{success:false,message:"Bağlı kayıt bulunamadı."};
  const parsed=schema.safeParse({version:formData.get("version"),description:formData.get("description")});if(!parsed.success)return{success:false,message:parsed.error.issues[0]?.message??"Formu kontrol edin."};
  const files=formData.getAll("files").filter((value):value is File=>value instanceof File&&value.size>0);const fileError=validateDocumentFiles(files,requestedType);if(fileError)return{success:false,message:fileError};
  if(requestedType==="BRANCH_DEVELOPMENT_STRATEGY"&&files.some(file=>file.type!=="application/pdf"))return{success:false,message:"Bayi geliştirme stratejisi yalnızca PDF olabilir."};
  const stored:{file:File;fileName:string;filePath:string}[]=[];try{for(const file of files){const saved=await storage.save(file);stored.push({file,...saved})}await prisma.$transaction(stored.map(({file,fileName,filePath})=>prisma.document.create({data:{fileName,originalFileName:path.basename(file.name),filePath,mimeType:file.type,fileSize:file.size,documentType:requestedType,version:parsed.data.version,description:parsed.data.description||null,franchiseeId:relation==="franchisee"?relationId:null,branchId:relation==="branch"?relationId:null,openingId:relation==="opening"?relationId:null,uploadedBy:"Sistem Kullanıcısı"}})))}catch{await Promise.all(stored.map(file=>storage.remove(file.filePath)));return{success:false,message:"Dosya yüklenemedi."}}
  revalidatePath(`/${relation==="franchisee"?"franchisees":relation==="branch"?"branches":"openings"}/${relationId}`);revalidatePath("/documents");return{success:true,message:"Doküman başarıyla yüklendi."};
}

export async function archiveDocument(documentId:string,formData:FormData){void formData;const document=await prisma.document.findUnique({where:{id:documentId}});if(!document)return;await prisma.document.update({where:{id:documentId},data:{archivedAt:new Date()}});refresh(document.candidateId)}
export async function restoreDocument(documentId:string,formData:FormData){void formData;const document=await prisma.document.findUnique({where:{id:documentId}});if(!document)return;await prisma.document.update({where:{id:documentId},data:{archivedAt:null}});refresh(document.candidateId)}
export async function toggleDocumentShared(documentId:string,formData:FormData){void formData;const document=await prisma.document.findUnique({where:{id:documentId}});if(!document)return;await prisma.document.update({where:{id:documentId},data:{customerShared:!document.customerShared,customerSharedAt:document.customerShared?null:new Date()}});refresh(document.candidateId)}
