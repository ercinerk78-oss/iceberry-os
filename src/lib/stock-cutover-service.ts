import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { matchImportProducts, TICIMAX_IMPORT_UNIT, validateImportRows } from "@/lib/product-import";
import { signImportPreview, verifyImportPreview } from "@/lib/product-import-token";
import { setPhysicalStock, reserveStock, shipReservedStock } from "@/lib/stock-service";
import { upsertShipmentBackorder } from "@/lib/backorders";
import { CUTOVER_ID, CUTOVER_ORDERS, cutoverLine, remainingCount, type CountImportRow } from "@/lib/stock-cutover-plan";

type Manifest = { userId: string; expires: number; id: string; snapshot: string; rows: CountImportRow[] };
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function loadPlan(tx: Prisma.TransactionClient, rows: CountImportRow[]) {
  validateImportRows(rows);
  if (rows.some(row => row.currentSku === "4448")) throw new Error("Fildişi Beyaz Pirinç 3KG bu işlemin dışında kalmalıdır.");
  const previous = await tx.auditLog.findFirst({ where: { entityType: "StockCutover", entityId: CUTOVER_ID, action: "STOCK_CUTOVER_COMPLETED" } });
  if (previous) throw new Error(`Bu sayım ve iki sevkiyat daha önce uygulandı. Tekrar stok düşülmedi. Yedek: ${previous.id}`);
  const products = await tx.product.findMany({
    select: { id: true, name: true, sku: true, currency: true, unit: true, salePrice: true, purchasePrice: true, isActive: true, archivedAt: true,
      units: { where: { code: TICIMAX_IMPORT_UNIT }, select: { conversionFactor: true } } },
    orderBy: { id: "asc" },
  });
  const matches = matchImportProducts(rows, products);
  for (const { row, product } of matches) {
    if (!Number.isFinite(row.countedQuantity) || row.countedQuantity < 0 || (row.unit === "Adet" && !Number.isInteger(row.countedQuantity))) throw new Error(`${row.name}: Geçersiz sayım.`);
    if (!product.isActive || product.archivedAt || product.sku !== row.sku || product.unit !== row.unit || product.salePrice !== Number(row.salePrice) || product.purchasePrice !== Number(row.purchasePrice) || product.units[0]?.conversionFactor !== row.factor) throw new Error(`${row.name}: Önce ürün Excel aktarımını tamamlayın; fiyat, birim veya koli eşleştirmesi henüz aynı değil.`);
  }
  const orders = await tx.franchiseOrder.findMany({ where: { orderNumber: { in: [...CUTOVER_ORDERS] } }, include: { items: { orderBy: { id: "asc" } }, shipment: true }, orderBy: { orderNumber: "asc" } });
  if (orders.length !== 2 || orders[0].warehouseId !== orders[1].warehouseId) throw new Error("İki sipariş aynı depoda bulunamadı.");
  for (const order of orders) {
    if (order.status !== "SUBMITTED" || order.shipment || order.shippedAt || order.parasutInvoiceId || order.invoicedAt || order.items.some(item => item.reservedQuantity || item.pickedQuantity || item.preparedQuantity || item.shippedQuantity || item.returnedQuantity || item.deliveredQuantity)) throw new Error(`${order.orderNumber}: Sipariş işleme alınmış, fatura/sevkiyat oluşmuş veya durumu değişmiş. Otomatik düzeltme durduruldu.`);
    if (order.items.length !== (order.orderNumber === CUTOVER_ORDERS[0] ? 13 : 7)) throw new Error(`${order.orderNumber}: Sipariş kalemleri değişmiş.`);
  }
  const warehouseId = orders[0].warehouseId;
  const warehouse = await tx.warehouse.findUniqueOrThrow({ where: { id: warehouseId }, select: { id: true, name: true } });
  const stocks = await tx.warehouseStock.findMany({ where: { warehouseId, productId: { in: matches.map(match => match.product.id) } }, orderBy: { id: "asc" } });
  const lines = orders.flatMap(order => order.items.map(item => {
    const match = matches.find(match => match.product.id === item.productId);
    if (!match) throw new Error(`${item.productName}: Sipariş ürünü sayım dosyasında yok.`);
    const converted = cutoverLine(match.row, item.quantity, order.orderNumber);
    return { orderId: order.id, orderNumber: order.orderNumber, itemId: item.id, productId: item.productId, oldQuantity: item.quantity, oldTotal: item.lineTotal, name: match.product.name, sku: match.row.sku, unit: match.row.unit, price: Number(match.row.salePrice), vatRate: item.vatRate, ...converted };
  }));
  if (lines.filter(line => line.missing > 0).length !== 1) throw new Error("Rubby Drop eksik sevk kaydı beklenen şekilde bulunamadı.");
  const inventory = matches.map(({ row, product }) => {
    const stock = stocks.find(stock => stock.productId === product.id);
    const shipped = lines.filter(line => line.productId === product.id).reduce((sum, line) => sum + line.shipped, 0);
    let finalQuantity: number;
    try { finalQuantity = remainingCount(row.countedQuantity, shipped, stock?.reservedQuantity ?? 0); }
    catch { throw new Error(`${product.name}: Sayım ${row.countedQuantity}, sevk ${shipped}, mevcut rezervasyon ${stock?.reservedQuantity ?? 0}. Sayım yetersiz; işlem yapılmadı.`); }
    return { productId: product.id, name: product.name, sku: product.sku, unit: product.unit, current: stock?.quantity ?? 0, reserved: stock?.reservedQuantity ?? 0, counted: row.countedQuantity, shipped, finalQuantity };
  });
  return { warehouse, orders, stocks, lines, inventory, snapshot: hash({ matches, orders, stocks }) };
}

export async function previewStockCutover(rows: CountImportRow[], userId: string) {
  const plan = await loadPlan(prisma, rows);
  const token = signImportPreview({ userId, expires: Date.now() + 30 * 60_000, id: CUTOVER_ID, snapshot: plan.snapshot, rows } satisfies Manifest);
  return { token, warehouse: plan.warehouse, inventory: plan.inventory, lines: plan.lines };
}

export async function applyStockCutover(token: string, userId: string) {
  const manifest = verifyImportPreview<Manifest>(token, userId);
  if (manifest.id !== CUTOVER_ID) throw new Error("Sayım onayı geçersiz.");
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext('product-catalog-import'))`;
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${CUTOVER_ID}))`;
    const done = await tx.auditLog.findFirst({ where: { entityType: "StockCutover", entityId: CUTOVER_ID, action: "STOCK_CUTOVER_COMPLETED" } });
    if (done) return { alreadyApplied: true, auditId: done.id };
    await tx.$queryRaw`SELECT id FROM "Product" ORDER BY id FOR UPDATE`;
    for (const number of CUTOVER_ORDERS) await tx.$queryRaw`SELECT id FROM "FranchiseOrder" WHERE "orderNumber" = ${number} FOR UPDATE`;
    const preliminary = await loadPlan(tx, manifest.rows);
    // Same per-product locks as all regular inventory operations prevent a concurrent stock edit.
    for (const item of [...preliminary.inventory].sort((a, b) => a.productId.localeCompare(b.productId))) {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${`stock:${preliminary.warehouse.id}:${item.productId}`}))`;
    }
    const plan = await loadPlan(tx, manifest.rows);
    if (plan.snapshot !== manifest.snapshot) throw new Error("Önizleme sonrası kayıtlar değişti. Yeniden kontrol edin.");
    const count = await tx.stockCount.create({ data: {
      warehouseId: plan.warehouse.id, title: "20.11.2026 Sayımı — Onaylı Stok Geçişi", status: "APPROVED", approvedById: userId, approvedAt: new Date(), completedAt: new Date(),
      notes: "20 Kasım fiziksel sayımı. Kullanıcı yalnız iki 23 Kasım sevkiyatı olduğunu doğruladı. Sevkiyatlar sayımdan sonra bir kez işlendi.",
      items: { create: plan.inventory.map(item => ({ productId: item.productId, expectedQuantity: item.current, countedQuantity: item.counted, differenceQuantity: item.counted - item.current, reasonCode: "CONFIRMED_COUNT" })) },
    } });
    for (const item of plan.inventory) {
      await setPhysicalStock(tx, { warehouseId: plan.warehouse.id, productId: item.productId, quantity: item.counted, referenceType: "STOCK_COUNT", referenceId: count.id, reasonCode: "CONFIRMED_COUNT", description: "20.11.2026 fiziksel sayımı; 23 Kasım sevkiyatlarından önceki miktar.", performedById: userId });
    }
    for (const order of plan.orders) {
      const lines = plan.lines.filter(line => line.orderId === order.id);
      const shipment = await tx.shipment.create({ data: { orderId: order.id, warehouseId: plan.warehouse.id, shipmentNumber: `SVK-${order.orderNumber}`, status: "SHIPPED", shippedAt: new Date() } });
      for (const line of lines) {
        if (line.shipped > 0) {
          const context = { warehouseId: plan.warehouse.id, productId: line.productId, quantity: line.shipped, referenceId: order.id, performedById: userId };
          await reserveStock(tx, { ...context, referenceType: "ORDER", description: `${order.orderNumber}: Sayım sonrası teyitli sevkiyat rezervasyonu.` });
          await shipReservedStock(tx, { ...context, referenceType: "SHIPMENT", description: `${order.orderNumber}: Kullanıcı tarafından teyit edilen 23.11.2026 fiili sevkiyatı.`, netSalesAmount: line.price * line.shipped, valuationCurrency: order.currency });
        }
        const vat = line.subtotal * line.vatRate / 100;
        await tx.franchiseOrderItem.update({ where: { id: line.itemId }, data: {
          productName: line.name, sku: line.sku, unit: line.unit, quantity: line.ordered, approvedQuantity: line.ordered, unitPrice: line.price,
          lineSubtotal: line.subtotal, lineVat: vat, lineTotal: line.subtotal + vat, manualShortShipment: line.missing > 0,
          reservedQuantity: 0, pickedQuantity: line.shipped, preparedQuantity: line.shipped, packedQuantity: line.shipped, shippedQuantity: line.shipped, missingQuantity: line.missing,
        } });
        await tx.shipmentItem.create({ data: { shipmentId: shipment.id, orderItemId: line.itemId, productId: line.productId, packedQuantity: line.shipped, shippedQuantity: line.shipped } });
        await tx.orderPickingScan.create({ data: { orderId: order.id, orderItemId: line.itemId, productId: line.productId, quantity: line.shipped, scanType: "MANUAL_OVERRIDE", scannedById: userId, note: "Sayım düzeltmesi sonrası kullanıcı teyidiyle geçmiş fiili sevkiyat kaydı; barkod okutulmadı." } });
        await upsertShipmentBackorder(tx, { orderId: order.id, orderItemId: line.itemId, shipmentId: shipment.id, branchId: order.branchId, productId: line.productId, orderedQuantity: line.ordered, shippedQuantity: line.shipped, unit: line.unit, reason: "STOCK_SHORTAGE", note: "Kullanıcı teyidi: Rubby Drop depoda yok, sevk edilmedi.", createdById: userId });
      }
      const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
      const vatTotal = lines.reduce((sum, line) => sum + line.subtotal * line.vatRate / 100, 0);
      await tx.franchiseOrder.update({ where: { id: order.id }, data: {
        subtotal, vatTotal, grandTotal: subtotal + vatTotal, status: lines.some(line => line.missing > 0) ? "BACKORDER_PENDING" : "SHIPPED", shippedAt: new Date(), readyToShipAt: new Date(), packedAt: new Date(), approvedAt: new Date(), approvedBy: userId,
        activities: { create: { type: "COUNT_CUTOVER_SHIPMENT", createdBy: userId, description: "Kullanıcı teyidiyle eski koli miktarları adet/kg karşılığına dönüştürüldü; KDV hariç Excel fiyatları uygulandı. 20 Kasım sayımı sonrası fiili sevkiyat bir kez işlendi. Otomatik fatura oluşturulmadı." } },
      } });
    }
    for (const item of plan.inventory) {
      const actual = await tx.warehouseStock.findUniqueOrThrow({ where: { warehouseId_productId: { warehouseId: plan.warehouse.id, productId: item.productId } } });
      if (Math.abs(actual.quantity - item.finalQuantity) > 1e-8 || Math.abs(actual.reservedQuantity - item.reserved) > 1e-8) throw new Error(`${item.name}: Son stok doğrulaması başarısız; tüm işlem geri alındı.`);
    }
    const audit = await tx.auditLog.create({ data: { userId, action: "STOCK_CUTOVER_COMPLETED", entityType: "StockCutover", entityId: CUTOVER_ID, description: "20 Kasım sayımı ve iki teyitli sevkiyat atomik olarak işlendi. Tekrar çalıştırma engellendi.", oldValue: JSON.stringify({ stocks: plan.stocks, orders: plan.orders }), newValue: JSON.stringify({ countId: count.id, inventory: plan.inventory, lines: plan.lines }) } });
    return { alreadyApplied: false, auditId: audit.id, countId: count.id };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 180_000 });
}
