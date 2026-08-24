import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class BranchHealthScoreService {
  async calculate(branchId: string) {
    const [previous, lastAudit, recentScoredVisits, openFindings, overdueTasks, revenueMissing, supplyAlerts] = await Promise.all([
      prisma.branchHealthScoreSnapshot.findFirst({ where: { branchId }, orderBy: { calculatedAt: "desc" } }),
      prisma.audit.findFirst({ where: { branchId, status: { in: ["COMPLETED", "REVIEW_REQUIRED", "SUBMITTED"] } }, orderBy: { createdAt: "desc" } }),
      prisma.branchVisit.findMany({
        where: { branchId, status: "COMPLETED", visitScore: { not: null } },
        select: { visitScore: true },
        orderBy: { completedAt: "desc" },
        take: 5,
      }),
      prisma.auditFinding.findMany({ where: { branchId, status: { notIn: ["CLOSED", "VERIFIED", "RESOLVED"] } } }),
      prisma.branchTask.count({ where: { branchId, dueDate: { lt: new Date() }, status: { in: ["OPEN", "IN_PROGRESS", "REJECTED"] } } }),
      prisma.branchRevenueRecord.count({ where: { branchId, periodType: "MONTHLY", status: { in: ["DRAFT", "REJECTED", "SUBMITTED"] } } }),
      prisma.supplyComplianceAlert.count({ where: { branchId, status: "OPEN" } }),
    ]);
    const criticalFindings = openFindings.filter((finding) => finding.isCritical || finding.severity === "CRITICAL").length;
    const majorFindings = openFindings.filter((finding) => finding.severity === "MAJOR").length;
    const auditComponent = new Prisma.Decimal(lastAudit?.percentageScore ?? 70);
    const visitComponent = recentScoredVisits.length
      ? new Prisma.Decimal(recentScoredVisits.reduce((sum, visit) => sum + Number(visit.visitScore ?? 0), 0)).div(recentScoredVisits.length).toDecimalPlaces(2)
      : new Prisma.Decimal(70);
    const findingComponent = new Prisma.Decimal(Math.max(0, 100 - criticalFindings * 25 - majorFindings * 10 - openFindings.length * 3));
    const taskComponent = new Prisma.Decimal(Math.max(0, 100 - overdueTasks * 8));
    const revenueComponent = new Prisma.Decimal(Math.max(0, 100 - revenueMissing * 6));
    const supplyComponent = new Prisma.Decimal(Math.max(0, 100 - supplyAlerts * 10));
    const score = auditComponent.mul(0.32)
      .plus(visitComponent.mul(0.16))
      .plus(findingComponent.mul(0.21))
      .plus(taskComponent.mul(0.15))
      .plus(revenueComponent.mul(0.08))
      .plus(supplyComponent.mul(0.08))
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
        visitComponent,
        findingComponent,
        taskComponent,
        revenueComponent,
        supplyComponent,
        weightsSnapshot: JSON.stringify({ audit: 0.32, visit: 0.16, finding: 0.21, task: 0.15, revenue: 0.08, supply: 0.08 }),
        positiveFactors: score.gte(85) ? "Operasyonel göstergeler güçlü." : null,
        negativeFactors: negativeFactors.join(", "),
        criticalRisks: criticalFindings ? "Kritik bulgu mevcut." : null,
        missingData: [lastAudit ? null : "Güncel denetim verisi eksik.", recentScoredVisits.length ? null : "Puanlı şube ziyareti verisi eksik."]
          .filter(Boolean)
          .join(" ") || null,
      },
    });
    await prisma.branch.update({ where: { id: branchId }, data: { healthScore: Number(score) } });

    return snapshot;
  }
}
