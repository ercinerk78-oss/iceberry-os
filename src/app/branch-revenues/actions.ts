"use server";

import path from "node:path";
import { revalidatePath } from "next/cache";

import { audit, requirePermission, requireUser } from "@/lib/auth";
import { monthPeriod } from "@/lib/branch-revenue";
import { ensureBranchRevenueSchema } from "@/lib/branch-revenue-schema";
import { canAccessBranch } from "@/lib/branch-access";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { branchRevenueSchema, revenueRejectSchema, type BranchRevenueState } from "@/lib/validations/branch-revenue";

function refresh(branchId?: string, id?: string) {
  revalidatePath("/branch-revenues");
  revalidatePath("/branches");
  if (branchId) revalidatePath(`/branches/${branchId}`);
  if (id) revalidatePath(`/branch-revenues/${id}`);
}

const nullableNumber = (value?: string) => (value ? Number(value) : null);

function isUniqueError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function canApprove(role: string) {
  return ["GENERAL_MANAGER", "OPERATIONS_MANAGER"].includes(role);
}

async function maybeStoreSupportDocument(branchId: string, file: File | null, userName: string) {
  if (!file || file.size === 0) return null;
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
  if (!allowed.includes(file.type)) throw new Error("Destekleyici dosya türü geçersiz.");
  if (file.size > 25 * 1024 * 1024) throw new Error("Destekleyici dosya en fazla 25 MB olabilir.");
  const saved = await storage.save(file);

  try {
    return await prisma.document.create({
      data: {
        branchId,
        fileName: saved.fileName,
        originalFileName: path.basename(file.name),
        filePath: saved.filePath,
        mimeType: file.type,
        fileSize: file.size,
        documentType: "OTHER",
        version: "1",
        description: "Ciro destekleyici dosyası",
        uploadedBy: userName,
      },
    });
  } catch (error) {
    await storage.remove(saved.filePath);
    throw error;
  }
}

export async function upsertBranchRevenue(_: BranchRevenueState, formData: FormData): Promise<BranchRevenueState> {
  await requirePermission("branch_revenue");
  const user = await requireUser();
  const parsed = branchRevenueSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };
  if (!(await canAccessBranch(parsed.data.branchId))) return { success: false, message: "Bu şubenin cirosuna erişim yetkiniz yok." };

  const { periodStart, periodEnd } = monthPeriod(parsed.data.year, parsed.data.month);
  const file = formData.get("supportFile") instanceof File ? formData.get("supportFile") as File : null;

  try {
    await ensureBranchRevenueSchema();
    const existing = await prisma.branchRevenueRecord.findUnique({
      where: { branchId_periodType_periodStart: { branchId: parsed.data.branchId, periodType: "MONTHLY", periodStart } },
      select: { id: true },
    });
    if (existing) return { success: false, message: "Bu şube ve ay için ciro kaydı zaten var.", id: existing.id };

    const document = await maybeStoreSupportDocument(parsed.data.branchId, file, user.name);
    const record = await prisma.$transaction(async (tx) => {
      const created = await tx.branchRevenueRecord.create({
        data: {
          branchId: parsed.data.branchId,
          periodType: "MONTHLY",
          periodStart,
          periodEnd,
          year: parsed.data.year,
          month: parsed.data.month,
          grossRevenue: parsed.data.grossRevenue,
          netRevenue: nullableNumber(parsed.data.netRevenue),
          targetRevenue: nullableNumber(parsed.data.targetRevenue),
          transactionCount: parsed.data.transactionCount ? Number(parsed.data.transactionCount) : null,
          averageTicket: nullableNumber(parsed.data.averageTicket),
          currency: parsed.data.currency,
          source: parsed.data.source,
          status: parsed.data.submit ? "SUBMITTED" : "DRAFT",
          notes: parsed.data.notes || null,
          supportDocumentId: document?.id ?? null,
          enteredById: user.id,
        },
      });
      await tx.branchTimelineEvent.create({
        data: {
          branchId: created.branchId,
          userId: user.id,
          action: parsed.data.submit ? "REVENUE_SUBMITTED" : "REVENUE_CREATED",
          entityType: "BranchRevenueRecord",
          entityId: created.id,
          newValue: `${created.grossRevenue} ${created.currency}`,
          description: parsed.data.submit ? "Ciro kaydı onaya gönderildi." : "Ciro kaydı oluşturuldu.",
        },
      });
      if (document) {
        await tx.branchTimelineEvent.create({
          data: {
            branchId: created.branchId,
            userId: user.id,
            action: "REVENUE_DOCUMENT_ATTACHED",
            entityType: "BranchRevenueRecord",
            entityId: created.id,
            newValue: document.originalFileName,
            description: "Ciro kaydına destekleyici doküman eklendi.",
          },
        });
      }
      return created;
    });
    await audit("REVENUE_CREATED", "BranchRevenueRecord", record.id, "Şube ciro kaydı oluşturuldu.", user.id);
    refresh(record.branchId, record.id);

    return { success: true, message: parsed.data.submit ? "Ciro kaydı onaya gönderildi." : "Ciro kaydı taslak olarak kaydedildi.", id: record.id };
  } catch (error) {
    return { success: false, message: isUniqueError(error) ? "Bu şube ve ay için ciro kaydı zaten var." : error instanceof Error ? error.message : "Ciro kaydı oluşturulamadı." };
  }
}

export async function createBranchRevenue(formData: FormData): Promise<void> {
  await upsertBranchRevenue({ success: false, message: "" }, formData);
}

export async function approveRevenue(id: string, formData: FormData) {
  void formData;
  await requirePermission("branch_revenue");
  const user = await requireUser();
  if (!canApprove(user.role)) throw new Error("Ciro onaylama yetkiniz yok.");
  await ensureBranchRevenueSchema();
  const current = await prisma.branchRevenueRecord.findUnique({ where: { id } });
  if (!current) return;
  const record = await prisma.branchRevenueRecord.update({
    where: { id },
    data: { status: "APPROVED", approvedById: user.id, approvedAt: new Date(), rejectionReason: null },
  });
  await prisma.branchTimelineEvent.create({
    data: { branchId: record.branchId, userId: user.id, action: "REVENUE_APPROVED", entityType: "BranchRevenueRecord", entityId: id, oldValue: current.status, newValue: "APPROVED", description: "Ciro kaydı onaylandı." },
  });
  await audit("REVENUE_APPROVED", "BranchRevenueRecord", id, "Ciro kaydı onaylandı.", user.id);
  refresh(record.branchId, id);
}

export async function rejectRevenue(id: string, formData: FormData) {
  await requirePermission("branch_revenue");
  const user = await requireUser();
  if (!canApprove(user.role)) throw new Error("Ciro reddetme yetkiniz yok.");
  const parsed = revenueRejectSchema.parse(Object.fromEntries(formData));
  await ensureBranchRevenueSchema();
  const current = await prisma.branchRevenueRecord.findUnique({ where: { id } });
  if (!current) return;
  const record = await prisma.branchRevenueRecord.update({
    where: { id },
    data: { status: "REJECTED", rejectionReason: parsed.rejectionReason, approvedById: null, approvedAt: null },
  });
  await prisma.branchTimelineEvent.create({
    data: { branchId: record.branchId, userId: user.id, action: "REVENUE_REJECTED", entityType: "BranchRevenueRecord", entityId: id, oldValue: current.status, newValue: "REJECTED", description: `Ciro kaydı reddedildi: ${parsed.rejectionReason}` },
  });
  await audit("REVENUE_REJECTED", "BranchRevenueRecord", id, "Ciro kaydı reddedildi.", user.id);
  refresh(record.branchId, id);
}

export async function lockRevenue(id: string, formData: FormData) {
  void formData;
  await requirePermission("branch_revenue");
  const user = await requireUser();
  if (user.role !== "GENERAL_MANAGER") throw new Error("Ciro kilitleme yetkiniz yok.");
  await ensureBranchRevenueSchema();
  const current = await prisma.branchRevenueRecord.findUnique({ where: { id } });
  if (!current) return;
  const record = await prisma.branchRevenueRecord.update({ where: { id }, data: { status: "LOCKED", lockedAt: new Date() } });
  await prisma.branchTimelineEvent.create({
    data: { branchId: record.branchId, userId: user.id, action: "REVENUE_LOCKED", entityType: "BranchRevenueRecord", entityId: id, oldValue: current.status, newValue: "LOCKED", description: "Ciro dönemi kilitlendi." },
  });
  await audit("REVENUE_LOCKED", "BranchRevenueRecord", id, "Ciro kaydı kilitlendi.", user.id);
  refresh(record.branchId, id);
}
