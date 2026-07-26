import type { Prisma } from "@prisma/client";

export const CLOSED_LEAD_PROCESS_STATUSES = ["CONVERTED_TO_CANDIDATE", "CLOSED"] as const;
export const CLOSED_LEAD_STATUSES = [
  "CONVERTED_TO_CANDIDATE",
  "CLOSED",
  "Adaya Dönüştürüldü",
  "Reddedildi",
  "Kapatıldı",
] as const;

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
