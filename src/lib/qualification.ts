import type { Prisma, PrismaClient } from "@prisma/client";

export const DEFAULT_CONCEPTS = ["Corner", "Cafe", "Self Cafe", "Kiosk", "Cadde Mağazası", "AVM", "Drive Thru", "Master Franchise"] as const;

type Tx = Prisma.TransactionClient | PrismaClient;

export function normalizeConceptCode(name: string) {
  return name
    .trim()
    .replace(/ı/g, "i")
    .replace(/İ/g, "I")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

export function normalizeTag(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

export function parseMultiValue(values: FormDataEntryValue[]) {
  return Array.from(new Set(values.map((value) => String(value).trim()).filter(Boolean)));
}

export function parseTags(value: FormDataEntryValue | null) {
  return Array.from(new Set(String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean)));
}

export async function ensureConcepts(tx: Tx, names: string[]) {
  const concepts = [];

  for (const name of Array.from(new Set(names.map((item) => item.trim()).filter(Boolean)))) {
    const code = normalizeConceptCode(name);
    if (!code) continue;
    concepts.push(
      await tx.concept.upsert({
        where: { code },
        update: { name, isActive: true },
        create: { name, code },
      }),
    );
  }

  return concepts;
}

export async function replaceCandidateConcepts(tx: Tx, candidateId: string, names: string[]) {
  const concepts = await ensureConcepts(tx, names);
  await tx.candidateConcept.deleteMany({ where: { candidateId } });
  if (concepts.length) {
    await tx.candidateConcept.createMany({
      data: concepts.map((concept) => ({ candidateId, conceptId: concept.id })),
      skipDuplicates: true,
    });
  }

  return concepts;
}

export async function replaceLeadConcepts(tx: Tx, leadId: string, names: string[]) {
  const concepts = await ensureConcepts(tx, names);
  await tx.leadConcept.deleteMany({ where: { leadId } });
  if (concepts.length) {
    await tx.leadConcept.createMany({
      data: concepts.map((concept) => ({ leadId, conceptId: concept.id })),
      skipDuplicates: true,
    });
  }

  return concepts;
}

export async function replaceCandidateTags(tx: Tx, candidateId: string, names: string[]) {
  const tags = [];

  for (const name of names) {
    const normalized = normalizeTag(name);
    if (!normalized) continue;
    tags.push(
      await tx.candidateTag.upsert({
        where: { normalized },
        update: { name },
        create: { name, normalized },
      }),
    );
  }

  await tx.candidateTagLink.deleteMany({ where: { candidateId } });
  if (tags.length) {
    await tx.candidateTagLink.createMany({
      data: tags.map((tag) => ({ candidateId, tagId: tag.id })),
      skipDuplicates: true,
    });
  }

  return tags;
}

export function scoreBucket(score: number | null | undefined) {
  if (!score) return "Puansız";
  if (score <= 3) return "1-3";
  if (score <= 6) return "4-6";
  if (score <= 8) return "7-8";
  return "9-10";
}

export function relativeTime(value: string) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes} dakika önce`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.round(hours / 24);
  return `${days} gün önce`;
}
