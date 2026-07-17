import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class BranchHealthScoreService {
  async calculate(branchId: string) {
    const [previous, lastAudit, openFindings, overdueTasks, revenueMissing, supplyAlerts, financeRisk] = await Promise.all([
      prisma.branchHealthScoreSnapshot.findFirst({ where: { branchId }, orderBy: { calculatedAt: "desc" } }),
      prisma.audit.findFirst({ where: { branchId, status: { in: ["COMPLETED", "REVIEW_REQUIRED", "SUBMITTED"] } }, orderBy: { createdAt: "desc" } }),
      prisma.auditFinding.findMany({ where: { branchId, status: { notIn: ["CLOSED", "VERIFIED", "RESOLVED"] } } }),
      prisma.branchTask.count({ where: { branchId, dueDate: { lt: new Date() }, status: { in: ["OPEN", "IN_PROGRESS", "REJECTED"] } } }),
      prisma.branchRevenueRecord.count({ where: { branchId, periodType: "MONTHLY", status: { in: ["DRAFT", "REJECTED", "SUBMITTED"] } } }),
      prisma.supplyComplianceAlert.count({ where: { branchId, status: "OPEN" } }),
      prisma.branchLedgerAccount.count({ where: { branchId, riskLimit: { not: null }, currentBalance: { gt: prisma.branchLedgerAccount.fields.riskLimit } } }).catch(() => 0),
    ]);
    const criticalFindings = openFindings.filter((finding) => finding.isCritical || finding.severity === "CRITICAL").length;
    const majorFindings = openFindings.filter((finding) => finding.severity === "MAJOR").length;
    const auditComponent = new Prisma.Decimal(lastAudit?.percentageScore ?? 70);
    const findingComponent = new Prisma.Decimal(Math.max(0, 100 - criticalFindings * 25 - majorFindings * 10 - openFindings.length * 3));
    const taskComponent = new Prisma.Decimal(Math.max(0, 100 - overdueTasks * 8));
    const revenueComponent = new Prisma.Decimal(Math.max(0, 100 - revenueMissing * 6));
    const supplyComponent = new Prisma.Decimal(Math.max(0, 100 - supplyAlerts * 10));
    const financeComponent = new Prisma.Decimal(Math.max(0, 100 - financeRisk * 15));
    const score = auditComponent.mul(0.35)
      .plus(findingComponent.mul(0.25))
      .plus(taskComponent.mul(0.15))
      .plus(revenueComponent.mul(0.1))
      .plus(supplyComponent.mul(0.1))
      .plus(financeComponent.mul(0.05))
      .toDecimalPlaces(2);
    const negativeFactors = [
      criticalFindings ? `${criticalFindings} kritik bulgu` : null,
      majorFindings ? `${majorFindings} önemli bulgu` : null,
      overdueTasks ? `${overdueTasks} geciken görev` : null,
      supplyAlerts ? `${supplyAlerts} açık tedarik uyarısı` : null,
    ].filter((item): item is string => Boolean(item));

    const snapshot = await prisma.branchHealthScoreSnapshot.create({
      data: {
        branchId,
        score,
        previousScore: previous?.score,
        auditComponent,
        findingComponent,
        taskComponent,
        revenueComponent,
        supplyComponent,
        financeComponent,
        weightsSnapshot: JSON.stringify({ audit: 0.35, finding: 0.25, task: 0.15, revenue: 0.1, supply: 0.1, finance: 0.05 }),
        positiveFactors: score.gte(85) ? "Operasyonel göstergeler güçlü." : null,
        negativeFactors: negativeFactors.join(", "),
        criticalRisks: criticalFindings ? "Kritik bulgu mevcut." : null,
        missingData: lastAudit ? null : "Güncel denetim verisi eksik.",
      },
    });
    await prisma.branch.update({ where: { id: branchId }, data: { healthScore: Number(score) } });

    return snapshot;
  }
}
