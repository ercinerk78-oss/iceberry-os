"use server";

import path from "node:path";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireBranchOperationAccess, requireCentralOperationsAccess, requireOperationsUser } from "@/lib/operations/access";
import { AuditWorkflowService, scoreForAnswer } from "@/lib/operations/audit-workflow-service";
import { BranchHealthScoreService } from "@/lib/operations/health-score-service";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

const templateSchema = z.object({
  name: z.string().trim().min(2),
  code: z.string().trim().min(2),
  auditType: z.string().trim().min(2),
  branchConcept: z.string().optional(),
  ownershipType: z.string().optional(),
  passingScore: z.coerce.number().min(0).max(100),
  requiresPhoto: z.string().optional(),
});

const assignmentSchema = z.object({
  branchId: z.string().min(1),
  templateId: z.string().min(1),
  dueAt: z.string().min(1),
  assignedAuditorId: z.string().optional(),
  priority: z.string().min(1),
});

const answerSchema = z.object({
  auditId: z.string().min(1),
  questionId: z.string().min(1),
  answerValue: z.string().min(1),
  comment: z.string().optional(),
});

const findingSchema = z.object({
  auditId: z.string().min(1),
  answerId: z.string().min(1),
  title: z.string().trim().min(2),
  description: z.string().trim().min(5),
  severity: z.string().min(1),
  assignedUserId: z.string().optional(),
});

const defaultSections = [
  "Dış Cephe ve Marka Görünümü",
  "Genel Temizlik",
  "Personel Hijyeni",
  "Gıda Güvenliği",
  "Ürün Hazırlama Standartları",
  "Reçete Uyumu",
  "Müşteri Deneyimi",
  "Depo ve Stok Düzeni",
  "Soğuk Zincir",
  "Ekipman ve Bakım",
  "Resmî Belgeler",
  "Genel Değerlendirme",
];
const auditPhotoMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
const maxAuditPhotoSize = 15 * 1024 * 1024;
const bool = (value?: string) => value === "on" || value === "1";

export async function createAuditTemplate(_state: { message: string }, formData: FormData) {
  const user = await requireCentralOperationsAccess();
  const parsed = templateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Denetim şablonu bilgileri eksik veya hatalı." };
  const input = parsed.data;
  const requiresPhoto = bool(input.requiresPhoto);
  try {
    await prisma.auditTemplate.create({
      data: {
        name: input.name,
        code: input.code.toUpperCase().replace(/\s+/g, "_"),
        auditType: input.auditType,
        passingScore: new Prisma.Decimal(input.passingScore),
        warningScore: new Prisma.Decimal(Math.max(0, input.passingScore - 10)),
        branchConcept: input.branchConcept || undefined,
        ownershipType: input.ownershipType || undefined,
        createdById: user.id,
        sections: {
          create: defaultSections.map((name, index) => ({
            name,
            code: `SECTION_${String(index + 1).padStart(2, "0")}`,
            sortOrder: index + 1,
            weight: new Prisma.Decimal(index === 3 || index === 8 ? 1.5 : 1),
            isCriticalSection: index === 3 || index === 8,
            questions: {
              create: [{
                code: `Q_${String(index + 1).padStart(2, "0")}_01`,
                title: `${name} standartlara uygun mu?`,
                questionType: "PASS_FAIL",
                scoringType: "FULL_OR_ZERO",
                maximumScore: new Prisma.Decimal(10),
                weight: new Prisma.Decimal(index === 3 || index === 8 ? 1.5 : 1),
                isCritical: index === 3 || index === 8,
                criticalFailureValue: index === 3 || index === 8 ? "FAIL" : null,
                requiresComment: true,
                requiresPhoto: requiresPhoto || index === 3 || index === 8,
                requiresCorrectiveAction: true,
                autoCreateTaskOnFailure: true,
                taskPriorityOnFailure: index === 3 || index === 8 ? "URGENT" : "HIGH",
                taskDueDays: index === 3 || index === 8 ? 2 : 7,
                sortOrder: 1,
                options: {
                  create: [
                    { label: "Uygun", value: "PASS", score: new Prisma.Decimal(10), sortOrder: 1 },
                    { label: "Uygun Değil", value: "FAIL", score: new Prisma.Decimal(0), isFailure: true, isCriticalFailure: index === 3 || index === 8, requiresComment: true, requiresEvidence: true, sortOrder: 2 },
                    { label: "Uygulanamaz", value: "NOT_APPLICABLE", score: new Prisma.Decimal(0), sortOrder: 3 },
                  ],
                },
              }],
            },
          })),
        },
      },
    });
    revalidatePath("/operations");
    return { message: "Denetim şablonu oluşturuldu." };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Denetim şablonu oluşturulamadı." };
  }
}

export async function publishAuditTemplate(templateId: string) {
  const user = await requireCentralOperationsAccess();
  await prisma.auditTemplate.update({
    where: { id: templateId },
    data: { status: "PUBLISHED", approvedById: user.id, approvedAt: new Date(), publishedAt: new Date() },
  });
  revalidatePath("/operations");
}

export async function createAuditAssignment(_state: { message: string }, formData: FormData) {
  const user = await requireCentralOperationsAccess();
  const parsed = assignmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Denetim ataması bilgileri eksik veya hatalı." };
  const input = parsed.data;
  await requireBranchOperationAccess(input.branchId);
  const [template, branch] = await Promise.all([
    prisma.auditTemplate.findUnique({ where: { id: input.templateId } }),
    prisma.branch.findUnique({ where: { id: input.branchId }, select: { branchName: true, city: true, district: true } }),
  ]);
  if (!branch) return { message: "Seçilen şube bulunamadı." };
  if (!template || template.status !== "PUBLISHED") return { message: "Yalnızca yayımlanmış şablon atanabilir." };
  await prisma.auditAssignment.create({
    data: {
      branchId: input.branchId,
      templateId: template.id,
      templateVersion: template.version,
      auditType: template.auditType,
      dueAt: new Date(input.dueAt),
      assignedAuditorId: input.assignedAuditorId || undefined,
      assignedById: user.id,
      priority: input.priority,
      status: "ASSIGNED",
    },
  });
  await prisma.notification.create({
    data: {
      userId: input.assignedAuditorId || undefined,
      role: input.assignedAuditorId ? undefined : "OPERATIONS_MANAGER",
      type: "AUDIT_ASSIGNED",
      title: "Denetim atandı",
      message: `${template.name} denetimi atandı.`,
      entityType: "AuditTemplate",
      entityId: template.id,
    },
  });
  revalidatePath("/operations");
  revalidatePath(`/branches/${input.branchId}`);
  revalidatePath("/branch-portal");
  return { message: `${branch.branchName} (${[branch.city, branch.district].filter(Boolean).join(" / ")}) için denetim ataması oluşturuldu.` };
}

export async function startAuditAssignment(assignmentId: string) {
  const user = await requireOperationsUser();
  const assignment = await prisma.auditAssignment.findUnique({ where: { id: assignmentId }, select: { branchId: true } });
  if (!assignment) throw new Error("Denetim ataması bulunamadı.");
  await requireBranchOperationAccess(assignment.branchId);
  await new AuditWorkflowService().startAssignment(assignmentId, user.id);
  revalidatePath("/operations");
  revalidatePath(`/branches/${assignment.branchId}`);
  revalidatePath("/branch-portal");
}

export async function saveAuditAnswer(_state: { message: string }, formData: FormData) {
  const user = await requireOperationsUser();
  const parsed = answerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Denetim cevabı eksik veya hatalı." };
  const input = parsed.data;
  const files = formData.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.some((file) => !auditPhotoMimeTypes.includes(file.type as typeof auditPhotoMimeTypes[number]))) return { message: "Denetim fotoğrafı JPG, PNG veya WEBP formatında olmalıdır." };
  if (files.some((file) => file.size > maxAuditPhotoSize)) return { message: "Her denetim fotoğrafı en fazla 15 MB olabilir." };
  const audit = await prisma.audit.findUnique({ where: { id: input.auditId }, select: { branchId: true, status: true } });
  if (!audit) return { message: "Denetim bulunamadı." };
  await requireBranchOperationAccess(audit.branchId);
  if (["SUBMITTED", "COMPLETED", "APPROVED"].includes(audit.status)) return { message: "Gönderilmiş denetim cevapları değiştirilemez." };
  const question = await prisma.auditQuestion.findUnique({
    where: { id: input.questionId },
    include: { options: true, section: true },
  });
  if (!question) return { message: "Soru bulunamadı." };
  if (question.requiresPhoto && input.answerValue !== "NOT_APPLICABLE" && !files.length) {
    const existingAnswer = await prisma.auditAnswer.findUnique({
      where: { auditId_questionId: { auditId: input.auditId, questionId: input.questionId } },
      select: { evidences: { where: { evidenceType: "PHOTO" }, select: { id: true }, take: 1 } },
    });
    if (!existingAnswer?.evidences.length) return { message: "Bu soru için fotoğraf zorunlu. Lütfen fotoğraf yükleyin." };
  }
  const selected = question.options.find((option) => option.value === input.answerValue);
  const scored = scoreForAnswer(input.answerValue, question.maximumScore, question.criticalFailureValue);
  const stored: { file: File; fileName: string; filePath: string }[] = [];
  try {
    for (const file of files) {
      const saved = await storage.save(file);
      stored.push({ file, ...saved });
    }
  const answer = await prisma.auditAnswer.upsert({
    where: { auditId_questionId: { auditId: input.auditId, questionId: input.questionId } },
    create: {
      auditId: input.auditId,
      questionId: input.questionId,
      questionSnapshot: JSON.stringify({ title: question.title, section: question.section.name, maximumScore: question.maximumScore.toString(), weight: question.weight.toString() }),
      answerValue: input.answerValue,
      selectedOptionIds: selected ? JSON.stringify([selected.id]) : null,
      score: scored.score,
      maximumScore: question.maximumScore,
      isPassed: scored.isPassed,
      isNotApplicable: scored.isNotApplicable,
      isCriticalFailure: scored.isCriticalFailure,
      comment: input.comment,
      answeredById: user.id,
      answeredAt: new Date(),
    },
    update: {
      answerValue: input.answerValue,
      selectedOptionIds: selected ? JSON.stringify([selected.id]) : null,
      score: scored.score,
      isPassed: scored.isPassed,
      isNotApplicable: scored.isNotApplicable,
      isCriticalFailure: scored.isCriticalFailure,
      comment: input.comment,
      answeredById: user.id,
      answeredAt: new Date(),
    },
  });
  for (const item of stored) {
    const document = await prisma.document.create({
      data: {
        fileName: item.fileName,
        originalFileName: path.basename(item.file.name),
        filePath: item.filePath,
        mimeType: item.file.type,
        fileSize: item.file.size,
        documentType: "AUDIT_PHOTO",
        version: "1.0",
        description: input.comment || "Denetim fotoğrafı",
        branchId: audit.branchId,
        uploadedBy: user.name,
      },
    });
    await prisma.auditEvidence.create({
      data: {
        auditId: input.auditId,
        answerId: answer.id,
        documentId: document.id,
        evidenceType: "PHOTO",
        caption: input.comment || path.basename(item.file.name),
        uploadedById: user.id,
      },
    });
  }
  if (!scored.isPassed && question.autoCreateTaskOnFailure) {
    await new AuditWorkflowService().createFindingFromAnswer({
      auditId: input.auditId,
      answerId: answer.id,
      branchId: audit.branchId,
      sectionId: question.sectionId,
      questionId: question.id,
      title: question.title,
      description: input.comment || `${question.title} için uygunsuzluk tespit edildi.`,
      severity: scored.isCriticalFailure || question.isCritical ? "CRITICAL" : "MAJOR",
      createdById: user.id,
    });
  }
  revalidatePath("/operations");
  revalidatePath(`/branches/${audit.branchId}`);
  return { message: files.length ? "Denetim cevabı ve fotoğraf kaydedildi." : "Denetim cevabı kaydedildi." };
  } catch (error) {
    await Promise.all(stored.map((item) => storage.remove(item.filePath)));
    return { message: error instanceof Error ? error.message : "Denetim fotoğrafı kaydedilemedi." };
  }
}

export async function submitAudit(auditId: string) {
  const user = await requireOperationsUser();
  const existing = await prisma.audit.findUnique({ where: { id: auditId }, select: { branchId: true } });
  if (!existing) throw new Error("Denetim bulunamadı.");
  await requireBranchOperationAccess(existing.branchId);
  await new AuditWorkflowService().submitAudit(auditId, user.id);
  revalidatePath("/operations");
  revalidatePath(`/branches/${existing.branchId}`);
  revalidatePath("/branch-portal");
}

export async function approveAudit(auditId: string) {
  const user = await requireCentralOperationsAccess();
  const audit = await new AuditWorkflowService().approveAudit(auditId, user.id);
  await new BranchHealthScoreService().calculate(audit.branchId);
  revalidatePath("/operations");
}

export async function createFinding(_state: { message: string }, formData: FormData) {
  const user = await requireCentralOperationsAccess();
  const parsed = findingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Bulgu bilgileri eksik veya hatalı." };
  const answer = await prisma.auditAnswer.findUnique({
    where: { id: parsed.data.answerId },
    include: { audit: true, question: true },
  });
  if (!answer) return { message: "Denetim cevabı bulunamadı." };
  await requireBranchOperationAccess(answer.audit.branchId);
  await new AuditWorkflowService().createFindingFromAnswer({
    auditId: parsed.data.auditId,
    answerId: parsed.data.answerId,
    branchId: answer.audit.branchId,
    sectionId: answer.question.sectionId,
    questionId: answer.questionId,
    title: parsed.data.title,
    description: parsed.data.description,
    severity: parsed.data.severity,
    assignedUserId: parsed.data.assignedUserId,
    createdById: user.id,
  });
  revalidatePath("/operations");
  return { message: "Bulgu ve düzeltici faaliyet oluşturuldu." };
}

export async function recalculateBranchHealth(branchId: string) {
  await requireBranchOperationAccess(branchId);
  await new BranchHealthScoreService().calculate(branchId);
  revalidatePath("/operations");
}
