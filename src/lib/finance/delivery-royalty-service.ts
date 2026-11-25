import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateDeliveryRoyalty, royaltySaveSchema } from "./delivery-royalty";
import { isRoyaltyExcludedHotel } from "./royalty-eligibility";

export async function saveDeliveryRoyalty(raw: unknown, userId: string, branchIds: string[] | null) {
  const input = royaltySaveSchema.parse(raw);
  return prisma.$transaction(tx => saveDeliveryRoyaltyTransaction(tx, input, userId, branchIds), { timeout: 15_000 });
}

export async function saveDeliveryRoyaltyTransaction(tx: Prisma.TransactionClient, raw: unknown, userId: string, branchIds: string[] | null) {
  const input = royaltySaveSchema.parse(raw);
  const record = await tx.branchRevenueRecord.findUnique({ where: { id: input.revenueId }, select: { branchId: true } });
  if (!record || (branchIds && !branchIds.includes(record.branchId))) throw new Error("Ciro kaydına erişim yetkiniz yok.");
  await tx.$queryRaw`SELECT id FROM "Branch" WHERE id = ${record.branchId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "BranchRevenueRecord" WHERE id = ${input.revenueId} FOR UPDATE`;
  const revenue = await tx.branchRevenueRecord.findUnique({ where: { id: input.revenueId }, include: { branch: true } });
  if (!revenue || revenue.branch.archivedAt) throw new Error("Şube veya ciro kaydı bulunamadı.");
  if (isRoyaltyExcludedHotel(revenue.branch)) throw new Error("Otel şubelerinde royalty hesaplanmaz.");
  if (revenue.updatedAt.toISOString() !== input.revenueUpdatedAt || revenue.branch.updatedAt.toISOString() !== input.branchUpdatedAt) throw new Error("Ciro veya şube ayarları değişmiş. Sayfayı yenileyip güncel verilerle tekrar hesaplayın.");
  const period = `${revenue.year}-${String(revenue.month).padStart(2, "0")}`;
  if (period !== input.period || revenue.periodType !== "MONTHLY" || !["DRAFT", "SUBMITTED", "APPROVED", "LOCKED"].includes(revenue.status)) throw new Error("Bu dönem için kullanılabilir aylık ciro kaydı yok.");
  if (revenue.currency !== "TRY") throw new Error("Bu hesaplama yalnız TL ciro kayıtları için kullanılabilir.");
  if (revenue.branch.ownershipType !== "FRANCHISE") throw new Error("Royalty yalnız franchise şubelerinde hesaplanabilir.");
  const sourceTotalRevenue = new Prisma.Decimal(revenue.grossRevenue).toFixed(2);
  const totalRevenue = input.totalRevenueSource === "MANUAL" ? input.totalRevenue : sourceTotalRevenue;
  if (!totalRevenue) throw new Error("Toplam ciro girin.");
  const result = calculateDeliveryRoyalty({ ...input, totalRevenue });
  const settings = { rate: input.rate, startMonth: input.startMonth, exemptionNote: input.exemptionNote, hasDelivery: input.hasDelivery, hasBreakEven: input.hasBreakEven, breakEven: input.breakEven };
  const branch = await tx.branch.update({ where: { id: revenue.branchId }, data: { royaltyCalculationSettings: settings } });
  const updated = await tx.branchRevenueRecord.update({ where: { id: input.revenueId }, data: { royaltyCalculationInputs: { ...settings, deliveryRevenue: input.deliveryRevenue, period, totalRevenue, totalRevenueSource: input.totalRevenueSource, sourceTotalRevenue, result, savedById: userId, savedAt: new Date().toISOString() } } });
  return { revenueUpdatedAt: updated.updatedAt.toISOString(), branchUpdatedAt: branch.updatedAt.toISOString(), result };
}
