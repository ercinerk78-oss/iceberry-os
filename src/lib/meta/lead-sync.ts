import { prisma } from "@/lib/prisma";
import { replaceLeadConcepts } from "@/lib/qualification";
import type { Prisma } from "@prisma/client";

import type { MetaField, MetaLeadData } from "./types";

const NAME_FIELDS = ["full_name", "name", "ad_soyad", "ad soyad", "adınız soyadınız", "adiniz soyadiniz"];
const FIRST_NAME_FIELDS = ["first_name", "firstname", "ad", "isim"];
const LAST_NAME_FIELDS = ["last_name", "lastname", "soyad", "soyisim"];
const PHONE_FIELDS = ["phone_number", "phone", "telefon", "cep telefonu", "cep_telefonu"];
const EMAIL_FIELDS = ["email", "e-posta", "eposta", "e posta"];
const CITY_FIELDS = ["city", "sehir", "şehir", "il"];
const BUDGET_FIELDS = ["investment_budget", "yatirim_butcesi", "yatırım bütçesi", "yatirim butcesi", "bütçe", "butce"];
const MESSAGE_FIELDS = ["message", "mesaj", "not", "aciklama", "açıklama"];
const CONCEPT_FIELDS = ["concept", "konsept", "requested_concept", "talep edilen konsept", "talep_edilen_konsept"];

export type MetaLeadMapping = {
  fullName: string;
  phone: string;
  email: string | null;
  city: string;
  requestedConcept: string;
  source: "Instagram" | "Facebook";
  leadDate: Date;
  normalizedPhone: string | null;
  normalizedEmail: string | null;
  campaignName: string;
  formName: string;
  message: string;
  investmentBudget: string;
  sourceFieldValues: string;
};

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("90")) return digits.slice(2);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

export function field(fields: MetaField[] | undefined, ...names: string[]) {
  const wanted = names.map(normalizeFieldName);
  return fields?.find((item) => wanted.includes(normalizeFieldName(item.name)))?.values?.[0]?.trim() || "";
}

export function detectMetaSource(platform: string | undefined): "Instagram" | "Facebook" {
  const value = (platform || "").toLocaleLowerCase("tr-TR");
  return value.includes("instagram") || value === "ig" ? "Instagram" : "Facebook";
}

export function mapMetaLeadToLeadInput(data: MetaLeadData): MetaLeadMapping {
  const firstName = field(data.field_data, ...FIRST_NAME_FIELDS);
  const lastName = field(data.field_data, ...LAST_NAME_FIELDS);
  const fullName = field(data.field_data, ...NAME_FIELDS) || [firstName, lastName].filter(Boolean).join(" ").trim() || `Meta Lead ${data.id}`;
  const phone = field(data.field_data, ...PHONE_FIELDS);
  const email = field(data.field_data, ...EMAIL_FIELDS);
  const city = field(data.field_data, ...CITY_FIELDS) || "Belirtilmedi";
  const source = detectMetaSource(data.platform);
  const investmentBudget = field(data.field_data, ...BUDGET_FIELDS);
  const message = field(data.field_data, ...MESSAGE_FIELDS);
  const formName = data.form_name || "Meta Lead Formu";
  const campaignName = data.campaign_name || "Meta kampanyası";
  const requestedConcept = conceptFrom(field(data.field_data, ...CONCEPT_FIELDS) || formName || campaignName);
  const normalizedPhone = phone ? normalizePhone(phone) : "";
  const normalizedEmail = email ? normalizeEmail(email) : "";

  return {
    fullName,
    phone: phone || "Belirtilmedi",
    email: email || null,
    city,
    requestedConcept,
    source,
    leadDate: data.created_time ? new Date(data.created_time) : new Date(),
    normalizedPhone: normalizedPhone || null,
    normalizedEmail: normalizedEmail || null,
    campaignName,
    formName,
    message,
    investmentBudget,
    sourceFieldValues: JSON.stringify(data.field_data ?? []),
  };
}

export async function syncMetaLead(data: MetaLeadData) {
  const mapped = mapMetaLeadToLeadInput(data);
  const duplicateWhere: Prisma.LeadWhereInput[] = [];

  if (data.id) duplicateWhere.push({ externalLeadId: data.id });
  if (mapped.normalizedPhone) duplicateWhere.push({ normalizedPhone: mapped.normalizedPhone });
  if (mapped.normalizedEmail) duplicateWhere.push({ normalizedEmail: mapped.normalizedEmail });
  if (mapped.phone !== "Belirtilmedi") duplicateWhere.push({ phone: mapped.phone });
  if (mapped.email) duplicateWhere.push({ email: mapped.email });

  const existing = duplicateWhere.length
    ? await prisma.lead.findFirst({ where: { OR: duplicateWhere }, orderBy: { createdAt: "desc" } })
    : null;

  if (existing) {
    const manualOverrides = parseManualOverrides(existing.manualOverrideFields);
    const lead = await prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({
        where: { id: existing.id },
        data: {
          fullName: manualOverrides.has("fullName") ? existing.fullName : mapped.fullName,
          phone: manualOverrides.has("phone") || mapped.phone === "Belirtilmedi" ? existing.phone : mapped.phone,
          email: manualOverrides.has("email") ? existing.email : mapped.email || existing.email,
          city: manualOverrides.has("city") || mapped.city === "Belirtilmedi" ? existing.city : mapped.city,
          source: mapped.source,
          requestedConcept: manualOverrides.has("requestedConcept") ? existing.requestedConcept : mapped.requestedConcept,
          investmentBudget: manualOverrides.has("investmentBudget") ? existing.investmentBudget : mapped.investmentBudget || existing.investmentBudget,
          description: manualOverrides.has("description") ? existing.description : mapped.message || existing.description,
          normalizedPhone: mapped.normalizedPhone || existing.normalizedPhone,
          normalizedEmail: mapped.normalizedEmail || existing.normalizedEmail,
          externalLeadId: existing.externalLeadId || data.id,
          metaFormId: data.form_id || existing.metaFormId,
          metaPageId: data.page_id || existing.metaPageId,
          sourceData: JSON.stringify(data).slice(0, 50000),
          sourceFieldValues: mapped.sourceFieldValues.slice(0, 50000),
          lastSyncedAt: new Date(),
          activities: {
            create: {
              type: "Meta üzerinden tekrar başvuru",
              description: buildActivityDescription(mapped, true),
            },
          },
        },
      });
      if (!manualOverrides.has("requestedConcept")) await replaceLeadConcepts(tx, existing.id, [mapped.requestedConcept]);
      return updated;
    });

    return { lead, created: false, duplicate: true };
  }

  const lead = await prisma.$transaction(async (tx) => {
    const created = await tx.lead.create({
      data: {
        fullName: mapped.fullName,
        phone: mapped.phone,
        email: mapped.email,
        city: mapped.city,
        source: mapped.source,
        requestedConcept: mapped.requestedConcept,
        investmentBudget: mapped.investmentBudget || null,
        description: mapped.message || null,
        status: "NEW",
        processStatus: "NEW",
        leadDate: mapped.leadDate,
        normalizedPhone: mapped.normalizedPhone,
        normalizedEmail: mapped.normalizedEmail,
        externalLeadId: data.id,
        metaFormId: data.form_id,
        metaPageId: data.page_id,
        sourceData: JSON.stringify(data).slice(0, 50000),
        sourceFieldValues: mapped.sourceFieldValues.slice(0, 50000),
        lastSyncedAt: new Date(),
        activities: {
          create: {
            type: `${mapped.source} Lead oluşturuldu`,
            description: buildActivityDescription(mapped, false),
          },
        },
      },
    });
    await replaceLeadConcepts(tx, created.id, [mapped.requestedConcept]);
    return created;
  });

  return { lead, created: true, duplicate: false };
}

export async function integrationLog(status: string, eventType: string, message: string, externalId?: string, payload?: unknown) {
  return prisma.integrationLog.create({
    data: {
      provider: "META",
      status,
      eventType,
      message,
      externalId,
      payload: payload ? JSON.stringify(payload).slice(0, 10000) : null,
    },
  });
}

function buildActivityDescription(mapped: MetaLeadMapping, repeatApplication: boolean) {
  const parts = [
    repeatApplication ? "Meta üzerinden tekrar başvuru alındı." : `${mapped.source} Lead Ads formundan kayıt işlendi.`,
    `Form: ${mapped.formName}.`,
    `Kampanya: ${mapped.campaignName}.`,
  ];

  if (mapped.investmentBudget) parts.push(`Yatırım bütçesi: ${mapped.investmentBudget}.`);
  if (mapped.message) parts.push(`Mesaj: ${mapped.message}.`);

  return parts.join(" ");
}

function conceptFrom(value: string) {
  const normalized = value.toLocaleLowerCase("tr-TR");
  if (normalized.includes("self")) return "Self Cafe";
  if (normalized.includes("corner")) return "Corner";
  return "Cafe";
}

function normalizeFieldName(value: string) {
  return value.trim().replace(/_/g, " ").toLocaleLowerCase("tr-TR");
}

function parseManualOverrides(value?: string | null) {
  if (!value) return new Set<string>();
  try {
    const parsed = JSON.parse(value);
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
  } catch {
    return new Set<string>();
  }
}
