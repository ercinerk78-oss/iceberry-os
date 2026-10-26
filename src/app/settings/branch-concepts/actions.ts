"use server";

import { revalidatePath } from "next/cache";

import { audit, requirePermission } from "@/lib/auth";
import { branchConceptSchema, normalizeBranchConceptCode, slugifyBranchConcept } from "@/lib/branch-concepts";
import { prisma } from "@/lib/prisma";

type ConceptState = { success: boolean; message: string };

const empty = (value?: string | null) => value || null;

function fromForm(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const codeInput = String(formData.get("code") ?? "");
  const slugInput = String(formData.get("slug") ?? "");

  return {
    code: normalizeBranchConceptCode(codeInput || name),
    name,
    slug: slugifyBranchConcept(slugInput || name),
    description: String(formData.get("description") ?? ""),
    icon: String(formData.get("icon") ?? "Store"),
    color: String(formData.get("color") ?? "#2f5f20"),
    isActive: formData.get("isActive") === "on",
    sortOrder: formData.get("sortOrder") ?? 0,
    minimumInvestment: formData.get("minimumInvestment") ?? "",
    maximumInvestment: formData.get("maximumInvestment") ?? "",
    averageAreaSqm: formData.get("averageAreaSqm") ?? "",
    averagePersonnel: formData.get("averagePersonnel") ?? "",
    royaltyModel: String(formData.get("royaltyModel") ?? ""),
  };
}

async function ensureUnique(data: { code: string; name: string; slug: string }, currentId?: string) {
  const duplicate = await prisma.branchConcept.findFirst({
    where: {
      id: currentId ? { not: currentId } : undefined,
      OR: [
        { code: { equals: data.code, mode: "insensitive" } },
        { name: { equals: data.name, mode: "insensitive" } },
        { slug: { equals: data.slug, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });

  if (duplicate) throw new Error("Aynı kod, ad veya slug ile başka bir konsept var.");
}

function toData(data: ReturnType<typeof branchConceptSchema.parse>) {
  return {
    code: data.code,
    name: data.name,
    slug: data.slug,
    description: empty(data.description),
    icon: data.icon,
    color: data.color,
    isActive: data.isActive,
    sortOrder: data.sortOrder,
    minimumInvestment: data.minimumInvestment,
    maximumInvestment: data.maximumInvestment,
    averageAreaSqm: data.averageAreaSqm,
    averagePersonnel: data.averagePersonnel,
    royaltyModel: empty(data.royaltyModel),
  };
}

function refresh() {
  revalidatePath("/settings");
  revalidatePath("/settings/branch-concepts");
  revalidatePath("/branches");
  revalidatePath("/branch-map");
  revalidatePath("/branch-revenues");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function createBranchConcept(_: ConceptState, formData: FormData): Promise<ConceptState> {
  const user = await requirePermission("settings");
  const parsed = branchConceptSchema.safeParse(fromForm(formData));
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };

  try {
    await ensureUnique(parsed.data);
    const concept = await prisma.branchConcept.create({ data: toData(parsed.data) });
    await audit("BRANCH_CONCEPT_CREATED", "BranchConcept", concept.id, "Şube konsepti oluşturuldu.", user.id);
    refresh();

    return { success: true, message: "Şube konsepti oluşturuldu." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Şube konsepti oluşturulamadı." };
  }
}

export async function updateBranchConcept(id: string, _: ConceptState, formData: FormData): Promise<ConceptState> {
  const user = await requirePermission("settings");
  const parsed = branchConceptSchema.safeParse(fromForm(formData));
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };

  try {
    await ensureUnique(parsed.data, id);
    await prisma.branchConcept.update({ where: { id }, data: toData(parsed.data) });
    await audit("BRANCH_CONCEPT_UPDATED", "BranchConcept", id, "Şube konsepti güncellendi.", user.id);
    refresh();

    return { success: true, message: "Şube konsepti güncellendi." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Şube konsepti güncellenemedi." };
  }
}

export async function toggleBranchConcept(id: string, formData: FormData) {
  void formData;
  const user = await requirePermission("settings");
  const current = await prisma.branchConcept.findUnique({ where: { id }, select: { isActive: true } });
  if (!current) return;

  await prisma.branchConcept.update({ where: { id }, data: { isActive: !current.isActive } });
  await audit("BRANCH_CONCEPT_TOGGLED", "BranchConcept", id, "Şube konsepti aktiflik durumu değiştirildi.", user.id);
  refresh();
}
