import { Prisma } from "@prisma/client";
import { z } from "zod";

export const royaltyMonthSchema = z.string().regex(/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/, "Geçerli bir ay ve yıl seçin.");
const amountSchema = z.string().trim().regex(/^\d{1,12}(\.\d{1,2})?$/, "Tutarı sıfır veya pozitif ve en fazla iki ondalık basamakla girin.");
export const royaltySettingsSchema = z.object({
  rate: z.union([z.literal(2), z.literal(3)]),
  startMonth: z.union([royaltyMonthSchema, z.literal("")]),
  exemptionNote: z.string().trim().max(1000),
  hasDelivery: z.boolean().default(true),
  hasBreakEven: z.boolean().default(false),
  breakEven: amountSchema.default("0"),
}).refine(value => !value.startMonth || value.exemptionNote.length > 0, { message: "Muafiyet için bir açıklama yazın.", path: ["exemptionNote"] });
export const royaltyInputsSchema = z.object({
  deliveryRevenue: amountSchema,
  rate: z.union([z.literal(2), z.literal(3)]),
  hasDelivery: z.boolean().default(true),
  hasBreakEven: z.boolean().default(false),
  breakEven: amountSchema.default("0"),
  totalRevenue: amountSchema.optional(),
  totalRevenueSource: z.enum(["BRANCH_REVENUE", "MANUAL"]).default("BRANCH_REVENUE"),
});
export const royaltySaveSchema = z.object({
  revenueId: z.string().min(1),
  revenueUpdatedAt: z.iso.datetime(),
  branchUpdatedAt: z.iso.datetime(),
  period: royaltyMonthSchema,
  ...royaltyInputsSchema.shape,
  startMonth: z.union([royaltyMonthSchema, z.literal("")]),
  exemptionNote: z.string().trim().max(1000),
}).refine(value => !value.startMonth || value.exemptionNote.length > 0, { message: "Muafiyet için bir açıklama yazın.", path: ["exemptionNote"] });
export type RoyaltySaveInput = z.infer<typeof royaltySaveSchema>;

export function defaultRoyaltyPeriod(now = new Date()) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(now);
  const [year, month] = date.split("-").map(Number);
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
}

export function calculateDeliveryRoyalty(input: { totalRevenue: string; deliveryRevenue: string; rate: number; period: string; startMonth?: string; hasDelivery?: boolean; hasBreakEven?: boolean; breakEven?: string }) {
  const total = new Prisma.Decimal(amountSchema.parse(input.totalRevenue));
  const delivery = new Prisma.Decimal(amountSchema.parse(input.deliveryRevenue));
  const { rate, hasDelivery, hasBreakEven, breakEven } = royaltyInputsSchema.parse(input);
  const deduction = new Prisma.Decimal(breakEven);
  if (!hasDelivery && !delivery.isZero()) throw new Error("Paket servisi olmayan şubede paket cirosu sıfır olmalıdır.");
  if (!hasBreakEven && !deduction.isZero()) throw new Error("Başabaş indirimi kapalıyken indirim tutarı sıfır olmalıdır.");
  const period = royaltyMonthSchema.parse(input.period);
  if (input.startMonth) royaltyMonthSchema.parse(input.startMonth);
  if (delivery.gt(total)) throw new Error("Paket servis cirosu toplam ciroyu aşamaz.");
  const round = (value: Prisma.Decimal) => value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const adjustedTotal = total.minus(deduction);
  const cafe = adjustedTotal.minus(delivery);
  const eligibleDelivery = delivery.mul("0.60");
  const base = cafe.plus(eligibleDelivery);
  if (base.isNegative()) throw new Error("Royalty matrahı negatif çıkıyor. Başabaş ve ciro tutarlarını kontrol edin; bu hesap kaydedilemez.");
  const exempt = Boolean(input.startMonth && period < input.startMonth);
  const net = exempt ? new Prisma.Decimal(0) : round(base.mul(rate).div(100));
  const vat = round(net.mul("0.20"));
  return { adjustedTotalRevenue: adjustedTotal.toFixed(2), cafeRevenue: cafe.toFixed(2), eligibleDeliveryRevenue: eligibleDelivery.toFixed(2), royaltyBase: base.toFixed(2), netRoyalty: net.toFixed(2), vat: vat.toFixed(2), totalRoyalty: net.plus(vat).toFixed(2), exempt };
}
