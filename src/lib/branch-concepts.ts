import { z } from "zod";

export const DEFAULT_BRANCH_CONCEPTS = [
  {
    id: "branch_concept_corner",
    code: "CORNER",
    name: "Corner",
    slug: "corner",
    description: "Kompakt alanlarda hızlı servis odaklı şube konsepti.",
    icon: "PanelTop",
    color: "#2563eb",
    sortOrder: 10,
  },
  {
    id: "branch_concept_self_cafe",
    code: "SELF_CAFE",
    name: "Self Cafe",
    slug: "self-cafe",
    description: "Self servis akışına uygun cafe konsepti.",
    icon: "Coffee",
    color: "#16a34a",
    sortOrder: 20,
  },
  {
    id: "branch_concept_cafe",
    code: "CAFE",
    name: "Cafe",
    slug: "cafe",
    description: "Tam cafe deneyimi sunan ana şube konsepti.",
    icon: "CupSoda",
    color: "#f59e0b",
    sortOrder: 30,
  },
  {
    id: "branch_concept_hotel",
    code: "HOTEL",
    name: "Hotel",
    slug: "hotel",
    description: "Otel içi veya konaklama lokasyonlarına uyumlu şube konsepti.",
    icon: "Hotel",
    color: "#7c3aed",
    sortOrder: 40,
  },
] as const;

export type BranchConceptOption = {
  id: string;
  code: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  isActive?: boolean;
  sortOrder?: number;
};

export type BranchConceptLike = Partial<BranchConceptOption> | null | undefined;

export const BRANCH_CONCEPT_ICONS = ["Store", "PanelTop", "Coffee", "CupSoda", "Hotel", "Building2", "MapPin", "Plane"] as const;

export const branchConceptSchema = z.object({
  code: z.string().trim().min(2, "Kod zorunludur.").max(40, "Kod en fazla 40 karakter olabilir."),
  name: z.string().trim().min(2, "Konsept adı zorunludur.").max(80, "Konsept adı en fazla 80 karakter olabilir."),
  slug: z.string().trim().min(2, "Slug zorunludur.").max(80, "Slug en fazla 80 karakter olabilir."),
  description: z.string().trim().max(500, "Açıklama en fazla 500 karakter olabilir.").optional().or(z.literal("")),
  icon: z.enum(BRANCH_CONCEPT_ICONS, "Geçerli bir ikon seçin."),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Renk #RRGGBB formatında olmalıdır."),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0, "Sıralama negatif olamaz.").max(9999, "Sıralama çok yüksek."),
  minimumInvestment: nullableNumber("Minimum yatırım geçerli bir sayı olmalıdır."),
  maximumInvestment: nullableNumber("Maksimum yatırım geçerli bir sayı olmalıdır."),
  averageAreaSqm: nullableNumber("Ortalama m² geçerli bir sayı olmalıdır."),
  averagePersonnel: nullableInteger("Ortalama personel geçerli bir tam sayı olmalıdır."),
  royaltyModel: z.string().trim().max(120, "Royalty modeli en fazla 120 karakter olabilir.").optional().or(z.literal("")),
}).refine(
  (data) => data.maximumInvestment == null || data.minimumInvestment == null || data.maximumInvestment >= data.minimumInvestment,
  { path: ["maximumInvestment"], message: "Maksimum yatırım minimum yatırımdan düşük olamaz." },
);

function nullableNumber(message: string) {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return null;
    return Number(value);
  }, z.number(message).min(0, message).nullable());
}

function nullableInteger(message: string) {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return null;
    return Number(value);
  }, z.number(message).int(message).min(0, message).nullable());
}

export function normalizeBranchConceptCode(value: string) {
  return value
    .trim()
    .replaceAll("İ", "I")
    .replaceAll("ı", "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function slugifyBranchConcept(value: string) {
  return value
    .trim()
    .replaceAll("İ", "I")
    .replaceAll("ı", "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function legacyBranchConceptCode(value?: string | null) {
  const normalized = normalizeBranchConceptCode(value ?? "");
  if (!normalized) return null;
  if (normalized === "CORNER") return "CORNER";
  if (["SELF", "SELF_CAFE", "SELFCAFE"].includes(normalized)) return "SELF_CAFE";
  if (["CAFE", "CAF"].includes(normalized)) return "CAFE";
  if (["HOTEL", "HOTEL_KIOSK", "OTEL", "OTEL_KIOSK"].includes(normalized)) return "HOTEL";

  return null;
}

export function branchConceptLabel(concept: BranchConceptLike, legacyConcept?: string | null) {
  return concept?.name ?? labelFromLegacy(legacyConcept);
}

export function branchConceptColor(concept: BranchConceptLike, legacyConcept?: string | null) {
  return concept?.color ?? DEFAULT_BRANCH_CONCEPTS.find((item) => item.code === legacyBranchConceptCode(legacyConcept ?? ""))?.color ?? "#64748b";
}

export function branchConceptIcon(concept: BranchConceptLike, legacyConcept?: string | null) {
  return concept?.icon ?? DEFAULT_BRANCH_CONCEPTS.find((item) => item.code === legacyBranchConceptCode(legacyConcept ?? ""))?.icon ?? "Store";
}

export function labelFromLegacy(value?: string | null) {
  const code = legacyBranchConceptCode(value ?? "");
  const concept = DEFAULT_BRANCH_CONCEPTS.find((item) => item.code === code);
  return concept?.name ?? value ?? "Tanımsız Konsept";
}

export function safeBranchConceptCode(concept: BranchConceptLike, legacyConcept?: string | null) {
  return concept?.code ?? legacyBranchConceptCode(legacyConcept ?? "") ?? "UNDEFINED";
}
