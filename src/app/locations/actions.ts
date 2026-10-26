"use server";

import path from "node:path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ConceptSuitability, LocationDocumentType, LocationStatus, LocationType, MatchStatus, Prisma, SourceType } from "@prisma/client";

import { requirePermission, requireUser } from "@/lib/auth";
import { matchStatusLabel } from "@/lib/locations";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

export type LocationActionState = { success: boolean; message: string; errors?: Record<string, string[]> };

const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const optionalString = z.preprocess(emptyToNull, z.string().max(500).nullable().optional());
const optionalDate = z.preprocess(emptyToNull, z.string().nullable().optional());
const optionalNumber = z.preprocess(emptyToNull, z.coerce.number().nonnegative().nullable().optional());

const locationSchema = z.object({
  name: z.string().trim().min(2, "Lokasyon adı zorunludur."),
  city: z.string().trim().min(2, "Şehir zorunludur."),
  district: optionalString,
  neighborhood: optionalString,
  fullAddress: optionalString,
  locationType: z.string().min(1) as z.ZodType<LocationType>,
  mallName: optionalString,
  latitude: optionalNumber,
  longitude: optionalNumber,
  areaM2: optionalNumber,
  monthlyRent: optionalNumber,
  turnoverRentRate: optionalNumber,
  transferFee: optionalNumber,
  estimatedSetupCost: optionalNumber,
  estimatedTotalInvestment: optionalNumber,
  conceptSuitability: z.string().min(1) as z.ZodType<ConceptSuitability>,
  currentBusinessName: optionalString,
  previousBrand: optionalString,
  sourceType: z.string().min(1) as z.ZodType<SourceType>,
  sourceUrl: optionalString,
  contactName: optionalString,
  contactPhone: optionalString,
  contactEmail: optionalString,
  assignedUserId: optionalString,
  status: z.string().min(1) as z.ZodType<LocationStatus>,
  description: optionalString,
  internalNotes: optionalString,
  availableFrom: optionalDate,
});

const linkSchema = z.object({
  leadId: z.string().min(1, "Lead seçimi zorunludur."),
  locationId: z.string().min(1, "Lokasyon seçimi zorunludur."),
  matchStatus: z.string().default("SUGGESTED") as z.ZodType<MatchStatus>,
  nextFollowUpAt: optionalDate,
  notes: optionalString,
});

const candidateLinkSchema = z.object({
  candidateId: z.string().min(1, "Aday seçimi zorunludur."),
  locationId: z.string().min(1, "Lokasyon seçimi zorunludur."),
  matchStatus: z.string().default("SUGGESTED") as z.ZodType<MatchStatus>,
  nextFollowUpAt: optionalDate,
  notes: optionalString,
});

const documentSchema = z.object({
  documentType: z.string().min(1) as z.ZodType<LocationDocumentType>,
  description: optionalString,
});

const uploadedDocumentSchema = z.object({
  documentType: z.string().min(1) as z.ZodType<LocationDocumentType>,
  description: optionalString,
  files: z.array(z.object({
    fileName: z.string().min(1),
    originalFileName: z.string().min(1),
    filePath: z.string().url(),
    fileUrl: z.string().url(),
    mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
    fileSize: z.number().int().positive().max(25 * 1024 * 1024),
  })).min(1),
});

function refresh(locationId?: string, leadId?: string) {
  revalidatePath("/locations");
  revalidatePath("/");
  revalidatePath("/dashboard");
  if (locationId) revalidatePath(`/locations/${locationId}`);
  if (leadId) revalidatePath(`/leads/${leadId}`);
}

function refreshCandidateLocation(locationId?: string, candidateId?: string) {
  refresh(locationId);
  revalidatePath("/candidates");
  revalidatePath("/pipeline");
  if (candidateId) revalidatePath(`/candidates/${candidateId}`);
}

function parsedLocationData(formData: FormData) {
  const parsed = locationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false as const, parsed };

  return {
    success: true as const,
    parsed,
    data: {
      ...parsed.data,
      availableFrom: parsed.data.availableFrom ? new Date(parsed.data.availableFrom) : null,
    },
  };
}

export async function createLocation(_: LocationActionState, formData: FormData): Promise<LocationActionState> {
  const user = await requireUser();
  await requirePermission("locations.create");
  const result = parsedLocationData(formData);

  if (!result.success) {
    return { success: false, message: "Lokasyon formundaki alanları kontrol edin.", errors: result.parsed.error.flatten().fieldErrors };
  }

  try {
    await prisma.candidateLocation.create({
      data: {
        ...result.data,
        createdByUserId: user.id,
      },
    });
    refresh();

    return { success: true, message: "Aday lokasyon oluşturuldu." };
  } catch (error) {
    console.error("[locations] create failed", error);
    return { success: false, message: "Lokasyon oluşturulamadı." };
  }
}

export async function updateLocation(locationId: string, _: LocationActionState, formData: FormData): Promise<LocationActionState> {
  await requirePermission("locations.update");
  const result = parsedLocationData(formData);

  if (!result.success) {
    return { success: false, message: "Lokasyon formundaki alanları kontrol edin.", errors: result.parsed.error.flatten().fieldErrors };
  }

  try {
    await prisma.candidateLocation.update({
      where: { id: locationId },
      data: result.data,
    });
    refresh(locationId);

    return { success: true, message: "Lokasyon güncellendi." };
  } catch (error) {
    console.error("[locations] update failed", error);
    return { success: false, message: "Lokasyon güncellenemedi." };
  }
}

export async function archiveLocation(locationId: string) {
  await requirePermission("locations.archive");
  await prisma.candidateLocation.update({ where: { id: locationId }, data: { archivedAt: new Date(), status: "PASSIVE" } });
  refresh(locationId);
}

export async function uploadLocationDocuments(locationId: string, _: LocationActionState, formData: FormData): Promise<LocationActionState> {
  const user = await requireUser();
  await requirePermission("locations.upload_document");
  const parsed = documentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: "Doküman türünü kontrol edin." };

  const location = await prisma.candidateLocation.findFirst({ where: { id: locationId, archivedAt: null }, select: { id: true } });
  if (!location) return { success: false, message: "Lokasyon bulunamadı." };

  const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  if (!files.length) return { success: false, message: "En az bir dosya seçin." };
  if (files.some((file) => file.size > 25 * 1024 * 1024)) return { success: false, message: "Dosya boyutu 25 MB sınırını aşamaz." };
  if (files.some((file) => !["application/pdf", "image/jpeg", "image/png"].includes(file.type))) return { success: false, message: "Yalnızca PDF, JPEG veya PNG yüklenebilir." };

  const stored: { file: File; fileName: string; filePath: string }[] = [];
  try {
    for (const file of files) {
      const saved = await storage.save(file);
      stored.push({ file, ...saved });
    }

    await prisma.$transaction(
      stored.map(({ file, fileName, filePath }) =>
        prisma.candidateLocationDocument.create({
          data: {
            locationId,
            documentType: parsed.data.documentType,
            fileName,
            originalFileName: path.basename(file.name),
            filePath,
            fileUrl: `/api/locations/documents/${fileName}`,
            mimeType: file.type,
            fileSize: file.size,
            description: parsed.data.description || null,
            uploadedByUserId: user.id,
          },
        }),
      ),
    );
    refresh(locationId);

    return { success: true, message: `${files.length} dosya yüklendi.` };
  } catch (error) {
    console.error("[locations] document upload failed", error);
    await Promise.all(stored.map((file) => storage.remove(file.filePath)));
    return { success: false, message: "Dosyalar yüklenemedi." };
  }
}

export async function registerLocationDocumentUploads(locationId: string, payload: unknown): Promise<LocationActionState> {
  const user = await requireUser();
  await requirePermission("locations.upload_document");
  const parsed = uploadedDocumentSchema.safeParse(payload);
  if (!parsed.success) return { success: false, message: "Yüklenen dosya bilgileri doğrulanamadı." };

  const location = await prisma.candidateLocation.findFirst({ where: { id: locationId, archivedAt: null }, select: { id: true } });
  if (!location) return { success: false, message: "Lokasyon bulunamadı." };

  try {
    await prisma.$transaction(
      parsed.data.files.map((file) =>
        prisma.candidateLocationDocument.create({
          data: {
            locationId,
            documentType: parsed.data.documentType,
            fileName: path.basename(file.fileName),
            originalFileName: path.basename(file.originalFileName),
            filePath: file.filePath,
            fileUrl: file.fileUrl,
            mimeType: file.mimeType,
            fileSize: file.fileSize,
            description: parsed.data.description || null,
            uploadedByUserId: user.id,
          },
        }),
      ),
    );
    refresh(locationId);

    return { success: true, message: `${parsed.data.files.length} dosya yüklendi.` };
  } catch (error) {
    console.error("[locations] blob document registration failed", error);
    await Promise.all(parsed.data.files.map((file) => storage.remove(file.filePath)));
    return { success: false, message: "Dosyalar kaydedilemedi." };
  }
}

export async function archiveLocationDocument(documentId: string) {
  await requirePermission("locations.upload_document");
  const document = await prisma.candidateLocationDocument.findUnique({ where: { id: documentId } });
  if (!document) return;
  await prisma.candidateLocationDocument.update({ where: { id: documentId }, data: { archivedAt: new Date() } });
  refresh(document.locationId);
}

export async function linkLocationToLead(_: LocationActionState, formData: FormData): Promise<LocationActionState> {
  const user = await requireUser();
  await requirePermission("locations.link_lead");
  const parsed = linkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: "Lead ve lokasyon seçimini kontrol edin." };

  try {
    const location = await prisma.candidateLocation.findUnique({ where: { id: parsed.data.locationId }, select: { name: true } });
    if (!location) return { success: false, message: "Lokasyon bulunamadı." };

    await prisma.$transaction([
      prisma.leadCandidateLocation.upsert({
        where: { leadId_locationId: { leadId: parsed.data.leadId, locationId: parsed.data.locationId } },
        update: {
          matchStatus: parsed.data.matchStatus,
          nextFollowUpAt: parsed.data.nextFollowUpAt ? new Date(parsed.data.nextFollowUpAt) : null,
          notes: parsed.data.notes || null,
        },
        create: {
          leadId: parsed.data.leadId,
          locationId: parsed.data.locationId,
          matchStatus: parsed.data.matchStatus,
          assignedByUserId: user.id,
          presentedAt: parsed.data.matchStatus === "SENT_TO_LEAD" ? new Date() : null,
          nextFollowUpAt: parsed.data.nextFollowUpAt ? new Date(parsed.data.nextFollowUpAt) : null,
          notes: parsed.data.notes || null,
        },
      }),
      prisma.leadActivity.create({
        data: {
          leadId: parsed.data.leadId,
          type: "LOCATION_SUGGESTED",
          description: `${location.name} lokasyonu adaya önerildi.`,
        },
      }),
    ]);
    refresh(parsed.data.locationId, parsed.data.leadId);

    return { success: true, message: "Lokasyon lead ile eşleştirildi." };
  } catch (error) {
    console.error("[locations] link lead failed", error);
    return { success: false, message: "Lokasyon lead ile eşleştirilemedi." };
  }
}

export async function linkLocationToCandidate(_: LocationActionState, formData: FormData): Promise<LocationActionState> {
  const user = await requireUser();
  await requirePermission("locations.link_lead");
  const parsed = candidateLinkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: "Aday ve lokasyon seçimini kontrol edin." };

  try {
    const [location, candidate] = await Promise.all([
      prisma.candidateLocation.findFirst({ where: { id: parsed.data.locationId, archivedAt: null }, select: { name: true } }),
      prisma.franchiseCandidate.findFirst({ where: { id: parsed.data.candidateId, archivedAt: null }, select: { fullName: true } }),
    ]);
    if (!location) return { success: false, message: "Lokasyon bulunamadı." };
    if (!candidate) return { success: false, message: "Aday bulunamadı." };

    await prisma.$transaction([
      prisma.candidateLocationMatch.upsert({
        where: { candidateId_locationId: { candidateId: parsed.data.candidateId, locationId: parsed.data.locationId } },
        update: {
          matchStatus: parsed.data.matchStatus,
          nextFollowUpAt: parsed.data.nextFollowUpAt ? new Date(parsed.data.nextFollowUpAt) : null,
          notes: parsed.data.notes || null,
        },
        create: {
          candidateId: parsed.data.candidateId,
          locationId: parsed.data.locationId,
          matchStatus: parsed.data.matchStatus,
          assignedByUserId: user.id,
          presentedAt: parsed.data.matchStatus === "SENT_TO_LEAD" ? new Date() : null,
          nextFollowUpAt: parsed.data.nextFollowUpAt ? new Date(parsed.data.nextFollowUpAt) : null,
          notes: parsed.data.notes || null,
        },
      }),
      prisma.candidateTimelineEvent.create({
        data: {
          candidateId: parsed.data.candidateId,
          eventType: "LOCATION_SUGGESTED",
          title: "Aday lokasyon bağlandı",
          description: `${location.name} lokasyonu ${candidate.fullName} adayına bağlandı.`,
          actorName: user.name,
        },
      }),
    ]);
    refreshCandidateLocation(parsed.data.locationId, parsed.data.candidateId);

    return { success: true, message: "Lokasyon adaya bağlandı." };
  } catch (error) {
    console.error("[locations] link candidate failed", error);
    return { success: false, message: "Lokasyon adaya bağlanamadı." };
  }
}

export async function updateLocationMatch(matchId: string, _: LocationActionState, formData: FormData): Promise<LocationActionState> {
  await requirePermission("locations.link_lead");
  const matchStatus = String(formData.get("matchStatus") || "SUGGESTED") as MatchStatus;
  const nextFollowUpAt = String(formData.get("nextFollowUpAt") || "");
  const notes = String(formData.get("notes") || "");

  try {
    const match = await prisma.leadCandidateLocation.update({
      where: { id: matchId },
      data: {
        matchStatus,
        presentedAt: matchStatus === "SENT_TO_LEAD" ? new Date() : undefined,
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
        notes: notes || null,
      },
      include: { location: { select: { name: true } }, lead: { select: { fullName: true } } },
    });

    const writes: Prisma.PrismaPromise<unknown>[] = [
      prisma.leadActivity.create({
        data: {
          leadId: match.leadId,
          type: "LOCATION_STATUS_CHANGE",
          description: `Lokasyon eşleşme durumu '${matchStatusLabel(matchStatus)}' olarak güncellendi.`,
        },
      }),
    ];

    if (matchStatus === "VISIT_PLANNED" && match.nextFollowUpAt) {
      writes.push(
        prisma.leadTask.create({
          data: {
            leadId: match.leadId,
            title: `${match.lead.fullName} için lokasyon ziyareti`,
            description: `${match.location.name} lokasyonu için ziyaret planlandı.`,
            dueDate: match.nextFollowUpAt,
            priority: "Yüksek",
            status: "Açık",
          },
        }),
      );
    }

    await prisma.$transaction(writes);
    refresh(match.locationId, match.leadId);

    return { success: true, message: "Eşleşme durumu güncellendi." };
  } catch (error) {
    console.error("[locations] match update failed", error);
    return { success: false, message: "Eşleşme durumu güncellenemedi." };
  }
}

export async function updateCandidateLocationMatch(matchId: string, _: LocationActionState, formData: FormData): Promise<LocationActionState> {
  await requirePermission("locations.link_lead");
  const matchStatus = String(formData.get("matchStatus") || "SUGGESTED") as MatchStatus;
  const nextFollowUpAt = String(formData.get("nextFollowUpAt") || "");
  const notes = String(formData.get("notes") || "");

  try {
    const match = await prisma.candidateLocationMatch.update({
      where: { id: matchId },
      data: {
        matchStatus,
        presentedAt: matchStatus === "SENT_TO_LEAD" ? new Date() : undefined,
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
        notes: notes || null,
      },
      include: { location: { select: { name: true } }, candidate: { select: { fullName: true } } },
    });

    await prisma.candidateTimelineEvent.create({
      data: {
        candidateId: match.candidateId,
        eventType: "LOCATION_STATUS_CHANGE",
        title: "Lokasyon durumu güncellendi",
        description: `${match.location.name} lokasyon eşleşmesi '${matchStatusLabel(matchStatus)}' olarak güncellendi.`,
      },
    });
    refreshCandidateLocation(match.locationId, match.candidateId);

    return { success: true, message: "Eşleşme durumu güncellendi." };
  } catch (error) {
    console.error("[locations] candidate match update failed", error);
    return { success: false, message: "Eşleşme durumu güncellenemedi." };
  }
}

export async function unlinkLocationMatch(matchId: string) {
  await requirePermission("locations.link_lead");
  const match = await prisma.leadCandidateLocation.delete({ where: { id: matchId } });
  await prisma.leadActivity.create({
    data: {
      leadId: match.leadId,
      type: "LOCATION_UNLINKED",
      description: "Aday lokasyon bağlantısı kaldırıldı.",
    },
  });
  refresh(match.locationId, match.leadId);
}

export async function unlinkCandidateLocationMatch(matchId: string) {
  await requirePermission("locations.link_lead");
  const match = await prisma.candidateLocationMatch.delete({
    where: { id: matchId },
    include: { location: { select: { name: true } } },
  });
  await prisma.candidateTimelineEvent.create({
    data: {
      candidateId: match.candidateId,
      eventType: "LOCATION_UNLINKED",
      title: "Aday lokasyon bağlantısı kaldırıldı",
      description: `${match.location.name} lokasyon bağlantısı kaldırıldı.`,
    },
  });
  refreshCandidateLocation(match.locationId, match.candidateId);
}

export async function importLocations(_: LocationActionState, formData: FormData): Promise<LocationActionState> {
  const user = await requireUser();
  await requirePermission("locations.create");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { success: false, message: "CSV dosyası seçin." };
  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) return { success: false, message: "CSV içinde aktarılacak satır bulunamadı." };

  const headers = rows[0].map((item) => item.trim());
  const errors: string[] = [];
  let created = 0;
  let skipped = 0;

  for (const [index, row] of rows.slice(1).entries()) {
    const record = Object.fromEntries(headers.map((header, headerIndex) => [header, row[headerIndex] || ""]));
    const duplicate = await prisma.candidateLocation.findFirst({
      where: { name: record.name, city: record.city, district: record.district || null, archivedAt: null },
      select: { id: true },
    });
    if (duplicate) {
      skipped += 1;
      continue;
    }

    const parsed = locationSchema.safeParse({
      ...record,
      locationType: record.locationType || "OTHER",
      conceptSuitability: record.conceptSuitability || "NOT_EVALUATED",
      sourceType: "INTERNAL",
      status: record.status || "NEW_OPPORTUNITY",
      description: record.notes || "",
    });
    if (!parsed.success) {
      errors.push(`${index + 2}. satır: ${parsed.error.issues[0]?.message || "Geçersiz veri"}`);
      continue;
    }

    await prisma.candidateLocation.create({
      data: {
        ...parsed.data,
        availableFrom: parsed.data.availableFrom ? new Date(parsed.data.availableFrom) : null,
        createdByUserId: user.id,
      },
    });
    created += 1;
  }

  refresh();

  return {
    success: errors.length === 0,
    message: `İçe aktarma tamamlandı. Oluşturulan: ${created}, atlanan tekrar: ${skipped}${errors.length ? `, hatalı: ${errors.slice(0, 5).join(" | ")}` : ""}`,
  };
}

function parseCsv(text: string) {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map(parseCsvLine);
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());

  return cells;
}
