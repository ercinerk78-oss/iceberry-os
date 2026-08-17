import type { Prisma } from "@prisma/client";

const HIDDEN_MAIN_BRANCH_CONCEPT_CODES = ["HOTEL"];
const HIDDEN_MAIN_BRANCH_LEGACY_CONCEPTS = ["HOTEL", "Hotel", "hotel", "OTEL", "Otel", "otel", "HOTEL_KIOSK", "OTEL_KIOSK"];

export const nonHotelMainBranchWhere: Prisma.BranchWhereInput = {
  NOT: [
    { conceptRelation: { is: { code: { in: HIDDEN_MAIN_BRANCH_CONCEPT_CODES } } } },
    { concept: { in: HIDDEN_MAIN_BRANCH_LEGACY_CONCEPTS } },
  ],
};

export const visibleMainBranchConceptWhere: Prisma.BranchConceptWhereInput = {
  code: { notIn: HIDDEN_MAIN_BRANCH_CONCEPT_CODES },
};

function branchWhereAndItems(and: Prisma.BranchWhereInput["AND"]) {
  if (!and) return [];
  return Array.isArray(and) ? and : [and];
}

export function withNonHotelMainBranchWhere(
  base: Prisma.BranchWhereInput = {},
  extraAnd: Prisma.BranchWhereInput[] = [],
): Prisma.BranchWhereInput {
  const { AND, ...rest } = base;

  return {
    ...rest,
    AND: [...branchWhereAndItems(AND), nonHotelMainBranchWhere, ...extraAnd],
  };
}
