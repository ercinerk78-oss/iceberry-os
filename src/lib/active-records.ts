import type { Prisma } from "@prisma/client";

export const CLOSED_LEAD_PROCESS_STATUSES = ["CONVERTED_TO_CANDIDATE", "CLOSED"] as const;
export const CLOSED_LEAD_STATUSES = [
  "CONVERTED_TO_CANDIDATE",
  "CLOSED",
  "Adaya Dönüştürüldü",
  "Adaya DÃ¶nÃ¼ÅŸtÃ¼rÃ¼ldÃ¼",
  "Reddedildi",
  "Kapatıldı",
  "KapatÄ±ldÄ±",
] as const;

export const CLOSED_CANDIDATE_STATUSES = [
  "CONVERTED_TO_BRANCH",
  "BRANCH_CONVERTED",
  "Şubeye Dönüştürüldü",
  "Åubeye DÃ¶nÃ¼ÅŸtÃ¼rÃ¼ldÃ¼",
  "Açıldı",
  "AÃ§Ä±ldÄ±",
] as const;

export function activeCandidateWhere(extra?: Prisma.FranchiseCandidateWhereInput): Prisma.FranchiseCandidateWhereInput {
  return {
    AND: [
      { archivedAt: null },
      { branch: { is: null } },
      { openingProjects: { none: { archivedAt: null } } },
      { status: { notIn: [...CLOSED_CANDIDATE_STATUSES] } },
      ...(extra ? [extra] : []),
    ],
  };
}

export function activeLeadWhere(extra?: Prisma.LeadWhereInput): Prisma.LeadWhereInput {
  return {
    AND: [
      { convertedCandidateId: null },
      {
        NOT: {
          OR: [
            { processStatus: { in: [...CLOSED_LEAD_PROCESS_STATUSES] } },
            { status: { in: [...CLOSED_LEAD_STATUSES] } },
          ],
        },
      },
      ...(extra ? [extra] : []),
    ],
  };
}

export function unconvertedLeadWhere(extra?: Prisma.LeadWhereInput): Prisma.LeadWhereInput {
  return {
    AND: [{ convertedCandidateId: null }, ...(extra ? [extra] : [])],
  };
}
