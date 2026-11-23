import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CUTOVER_ID, CUTOVER_ORDERS } from "@/lib/stock-cutover-plan";
import { normalizeImportName } from "@/lib/product-import";
import { calculateOrderTaxTotals } from "@/lib/order-tax-totals";

const correctionId = "confirmed-fork-049-vat-20-20261123";
export async function correctConfirmedForkTax(userId: string) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext('product-catalog-import'))`;
    const done = await tx.auditLog.findFirst({ where: { entityType: "TaxCorrection", entityId: correctionId, action: "CONFIRMED_TAX_CORRECTED" } });
    if (done) return { alreadyApplied: true, auditId: done.id };
    if (!await tx.auditLog.findFirst({ where: { entityType: "StockCutover", entityId: CUTOVER_ID, action: "STOCK_CUTOVER_COMPLETED" }, select: { id: true } })) throw new Error("Önce teyitli sayım ve sevkiyat işlemi tamamlanmalıdır.");
    await tx.$queryRaw`SELECT id FROM "Product" WHERE sku = '049' FOR UPDATE`;
    const product = await tx.product.findUniqueOrThrow({ where: { sku: "049" }, select: { id: true, name: true, vatRate: true, salePrice: true } });
    if (normalizeImportName(product.name) !== normalizeImportName("KULLAN AT AHŞAP ÇATAL PKT 100") || product.vatRate !== 9100 || product.salePrice !== 0.6) throw new Error("Onaylanan ürün veya vergi kaydı değişmiş. İşlem durduruldu.");
    for (const orderNumber of CUTOVER_ORDERS) await tx.$queryRaw`SELECT id FROM "FranchiseOrder" WHERE "orderNumber" = ${orderNumber} FOR UPDATE`;
    const orders = await tx.franchiseOrder.findMany({ where: { orderNumber: { in: [...CUTOVER_ORDERS] } }, include: { items: true } });
    if (orders.length !== 2) throw new Error("Onaylanan iki sipariş bulunamadı.");
    for (const order of orders) {
      const line = order.items.find(item => item.productId === product.id);
      const expectedQuantity = order.orderNumber === CUTOVER_ORDERS[0] ? 500 : 400;
      if (order.parasutInvoiceId || order.invoicedAt || !["SHIPPED", "BACKORDER_PENDING"].includes(order.status) || !line || line.quantity !== expectedQuantity || line.shippedQuantity !== expectedQuantity || line.unitPrice !== 0.6 || line.vatRate !== 9100) throw new Error(`${order.orderNumber}: Fatura veya sipariş kaydı değişmiş; otomatik vergi düzeltmesi yapılmadı.`);
    }
    await tx.product.update({ where: { id: product.id }, data: { vatRate: 20 } });
    const totals: { orderNumber: string; grandTotal: number }[] = [];
    for (const order of orders) {
      const line = order.items.find(item => item.productId === product.id)!;
      const net = line.quantity * line.unitPrice;
      await tx.franchiseOrderItem.update({ where: { id: line.id }, data: { vatRate: 20, lineSubtotal: net, lineVat: net * 0.2, lineTotal: net * 1.2 } });
      const summary = calculateOrderTaxTotals(order.items.map(item => ({ lineSubtotal: item.productId === product.id ? net : item.lineSubtotal, vatRate: item.productId === product.id ? 20 : item.vatRate })));
      await tx.franchiseOrder.update({ where: { id: order.id }, data: { ...summary, activities: { create: { type: "CONFIRMED_TAX_CORRECTION", createdBy: userId, description: "Kullanıcı onayıyla Ahşap Çatal'ın hatalı %9100 KDV kaydı %20 olarak düzeltildi. Stok ve sevkiyat miktarları değiştirilmedi; fatura oluşturulmadı." } } } });
      totals.push({ orderNumber: order.orderNumber, grandTotal: summary.grandTotal });
    }
    const audit = await tx.auditLog.create({ data: { userId, entityType: "TaxCorrection", entityId: correctionId, action: "CONFIRMED_TAX_CORRECTED", description: "049 Ahşap Çatal KDV oranı kullanıcı onayıyla %20 olarak düzeltildi. Stok ve sevkiyatlara dokunulmadı.", oldValue: JSON.stringify({ product, orders }), newValue: JSON.stringify({ vatRate: 20, totals }) } });
    return { alreadyApplied: false, auditId: audit.id, totals };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60_000, maxWait: 10_000 });
}
