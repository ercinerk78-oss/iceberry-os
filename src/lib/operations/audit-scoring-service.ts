import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type AuditWithAnswers = Prisma.AuditGetPayload<{
  include: {
    template: { include: { sections: { include: { questions: true } } } };
    answers: true;
  };
}>;

export class AuditScoringService {
  async scoreAudit(auditId: string) {
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      include: {
        template: { include: { sections: { where: { isActive: true }, include: { questions: { where: { isActive: true } } } } } },
        answers: true,
      },
    });
    if (!audit) throw new Error("Denetim bulunamadı.");

    const result = this.calculate(audit);
    await prisma.audit.update({
      where: { id: audit.id },
      data: {
        totalScore: result.totalScore,
        maximumScore: result.maximumScore,
        percentageScore: result.percentageScore,
        result: result.result,
        criticalFindingCount: result.criticalFailureCount,
        notApplicableCount: result.notApplicableCount,
        unansweredCount: result.unansweredCount,
        requiresFollowUp: result.requiresFollowUp,
      },
    });

    return result;
  }

  calculate(audit: AuditWithAnswers) {
    const answers = new Map(audit.answers.map((answer) => [answer.questionId, answer]));
    let totalScore = new Prisma.Decimal(0);
    let maximumScore = new Prisma.Decimal(0);
    let criticalFailureCount = 0;
    let notApplicableCount = 0;
    let unansweredCount = 0;
    const sectionSnapshots: { section: string; score: string; max: string; percentage: string }[] = [];

    for (const section of audit.template.sections) {
      let sectionScore = new Prisma.Decimal(0);
      let sectionMax = new Prisma.Decimal(0);
      for (const question of section.questions) {
        const answer = answers.get(question.id);
        if (!answer) {
          unansweredCount += 1;
          sectionMax = sectionMax.plus(question.maximumScore.mul(question.weight));
          continue;
        }
        if (answer.isNotApplicable) {
          notApplicableCount += 1;
          continue;
        }
        if (answer.isCriticalFailure) criticalFailureCount += 1;
        const weightedScore = answer.score.mul(question.weight);
        const weightedMax = answer.maximumScore.gt(0) ? answer.maximumScore.mul(question.weight) : question.maximumScore.mul(question.weight);
        sectionScore = sectionScore.plus(weightedScore);
        sectionMax = sectionMax.plus(weightedMax);
      }
      totalScore = totalScore.plus(sectionScore);
      maximumScore = maximumScore.plus(sectionMax);
      const sectionPercentage = sectionMax.gt(0) ? sectionScore.div(sectionMax).mul(100) : new Prisma.Decimal(0);
      sectionSnapshots.push({
        section: section.name,
        score: sectionScore.toString(),
        max: sectionMax.toString(),
        percentage: sectionPercentage.toDecimalPlaces(2).toString(),
      });
    }

    const percentageScore = maximumScore.gt(0) ? totalScore.div(maximumScore).mul(100).toDecimalPlaces(2) : new Prisma.Decimal(0);
    const result = this.resultFor(percentageScore, audit.passingScore, criticalFailureCount, unansweredCount);

    return {
      totalScore: totalScore.toDecimalPlaces(2),
      maximumScore: maximumScore.toDecimalPlaces(2),
      percentageScore,
      result,
      criticalFailureCount,
      notApplicableCount,
      unansweredCount,
      requiresFollowUp: criticalFailureCount > 0 || percentageScore.lt(audit.passingScore),
      snapshot: JSON.stringify(sectionSnapshots),
    };
  }

  private resultFor(score: Prisma.Decimal, passingScore: Prisma.Decimal, criticalFailureCount: number, unansweredCount: number) {
    if (unansweredCount > 0) return "INCOMPLETE";
    if (criticalFailureCount > 0) return "CRITICAL_FAILURE";
    if (score.gte(95)) return "EXCELLENT";
    if (score.gte(passingScore)) return "PASSED";
    if (score.gte(passingScore.minus(10))) return "CONDITIONAL_PASS";
    return "FAILED";
  }
}
