import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { matchImportProducts, normalizeImportName, TICIMAX_IMPORT_UNIT, validateImportRows, type ProductImportRow } from "@/lib/product-import";
import { signImportPreview, verifyImportPreview } from "@/lib/product-import-token";

type Choices = Record<string, string>;
type Manifest = { userId: string; expires: number; id: string; snapshot: string; rows: ProductImportRow[]; choices: Choices };
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const productSelect = { id: true, name: true, sku: true, unit: true, currency: true, vatRate: true, purchasePrice: true, salePrice: true, archivedAt: true, isActive: true, updatedAt: true } as const;

async function loadPlan(db: Prisma.TransactionClient, rows: ProductImportRow[], choices: Choices) {
  validateImportRows(rows);
  const [products, suppliers, mappings, units] = await Promise.all([
    db.product.findMany({ select: productSelect, orderBy: { id: "asc" } }),
    db.supplier.findMany({ select: { id: true, name: true, status: true, archivedAt: true, updatedAt: true }, orderBy: { id: "asc" } }),
    db.supplierProduct.findMany({ orderBy: { id: "asc" } }),
    db.productUnit.findMany({ where: { code: TICIMAX_IMPORT_UNIT }, orderBy: { id: "asc" } }),
  ]);
  const matches = matchImportProducts(rows, products);
  for (const { product } of matches) if (product.archivedAt || !product.isActive) throw new Error(`${product.name}: Pasif veya arşivlenmiş ürün değiştirilemez.`);
  const supplierOptions = suppliers.filter(s => !s.archivedAt && s.status === "ACTIVE").map(s => ({ id: s.id, name: s.name }));
  const errors: string[] = [];
  const assignments = [...new Set(rows.map(row => row.supplier))].map(name => {
    const same = suppliers.filter(s => normalizeImportName(s.name) === normalizeImportName(name));
    const automatic = same.length === 1 && !same[0].archivedAt && same[0].status === "ACTIVE" ? same[0].id : "";
    const selected = choices[name] ?? automatic;
    if (!selected) errors.push(`${name}: Tedarikçi seçin veya yeni kart oluşturmayı açıkça seçin.`);
    else if (selected === "__CREATE__" && same.length) errors.push(`${name}: Aynı isimli kayıt mevcut; mükerrer oluşturmamak için mevcut kartı seçin.`);
    else if (selected !== "__CREATE__" && !supplierOptions.some(s => s.id === selected)) errors.push(`${name}: Aktif tedarikçi seçilmelidir.`);
    return { name, selected, label: selected === "__CREATE__" ? `Yeni kart: ${name}` : supplierOptions.find(s => s.id === selected)?.name ?? "Seçilmedi" };
  });
  for (const { product } of matches) {
    const unit = units.find(unit => unit.productId === product.id);
    if (unit?.isBase || unit?.isPurchaseDefault || unit?.isShipmentDefault) errors.push(`${product.name}: Ticimax birimi varsayılan iş akışında kullanılıyor; önce kontrol edilmeli.`);
  }
  const snapshot = hash({ products, suppliers, mappings, units });
  return { matches, assignments, supplierOptions, errors, snapshot, mappings, units };
}

export async function previewProductImport(rows: ProductImportRow[], choices: Choices, userId: string) {
  const plan = await loadPlan(prisma, rows, choices);
  const manifest: Manifest = { rows, choices: Object.fromEntries(plan.assignments.map(s => [s.name, s.selected])), userId, expires: Date.now() + 30 * 60_000, id: randomUUID(), snapshot: plan.snapshot };
  return {
    token: plan.errors.length ? "" : signImportPreview(manifest), errors: plan.errors,
    assignments: plan.assignments, suppliers: plan.supplierOptions,
    rows: plan.matches.map(({ row, product }) => ({ ...row, productId: product.id, oldName: product.name, oldSku: product.sku, oldUnit: product.unit, oldBuy: String(product.purchasePrice), oldSell: String(product.salePrice), vatRate: product.vatRate })),
    untouchedCount: await prisma.product.count({ where: { id: { notIn: plan.matches.map(m => m.product.id) }, archivedAt: null, isActive: true } }),
  };
}

export async function applyProductImport(token: string, userId: string) {
  const manifest = verifyImportPreview<Manifest>(token, userId);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext('product-catalog-import'))`;
    const previous = await tx.auditLog.findFirst({ where: { entityType: "ProductImport", entityId: manifest.id, action: "PRODUCT_CATALOG_IMPORTED" } });
    if (previous) return { count: manifest.rows.length, alreadyApplied: true, auditId: previous.id };
    // Lock the catalog before rechecking the signed preview; stock quantities are never written.
    await tx.$queryRaw`SELECT id FROM "Product" ORDER BY id FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Supplier" ORDER BY id FOR UPDATE`;
    const plan = await loadPlan(tx, manifest.rows, manifest.choices);
    if (plan.errors.length || plan.snapshot !== manifest.snapshot) throw new Error("Kayıtlar önizlemeden sonra değişti. Yeniden önizleyip onaylayın.");
    const precision = await tx.$queryRaw<{ numeric_scale: number }[]>`SELECT numeric_scale FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'SupplierProduct' AND column_name = 'unitPrice'`;
    if ((precision[0]?.numeric_scale ?? 0) < 15) throw new Error("Hassas fiyat güncellemesi henüz veritabanına uygulanmamış. Aktarım durduruldu.");
    const ids = plan.matches.map(m => m.product.id);
    const stocks = await tx.warehouseStock.findMany({ where: { productId: { in: ids } }, orderBy: { id: "asc" } });
    const before = { products: plan.matches.map(m => m.product), supplierProducts: plan.mappings.filter(m => ids.includes(m.productId)), units: plan.units.filter(u => ids.includes(u.productId)), stocks };
    const supplierIds = new Map<string, string>();
    const createdSuppliers: { id: string; name: string }[] = [];
    for (const assignment of plan.assignments) {
      if (assignment.selected === "__CREATE__") {
        const supplier = await tx.supplier.create({ data: { name: assignment.name, notes: "Onaylı Excel ürün aktarımında oluşturuldu." }, select: { id: true, name: true } });
        supplierIds.set(assignment.name, supplier.id); createdSuppliers.push(supplier);
      } else supplierIds.set(assignment.name, assignment.selected);
    }
    // Temporary unique codes allow an existing SKU to move to another matched product safely.
    for (const { row, product } of plan.matches) if (row.sku !== product.sku) await tx.product.update({ where: { id: product.id }, data: { sku: `__IMPORT_${manifest.id}_${product.id}` } });
    for (const { row, product } of plan.matches) {
      await tx.product.update({ where: { id: product.id }, data: {
        name: row.name, sku: row.sku, unit: row.unit, purchasePrice: Number(row.purchasePrice), salePrice: Number(row.salePrice),
      } });
      const supplierId = supplierIds.get(row.supplier)!;
      await tx.supplierProduct.upsert({
        where: { supplierId_productId: { supplierId, productId: product.id } },
        create: { supplierId, productId: product.id, currency: "TRY", unitPrice: new Prisma.Decimal(row.purchasePrice), lastQuotedAt: new Date() },
        update: { unitPrice: new Prisma.Decimal(row.purchasePrice), lastQuotedAt: new Date() },
      });
      await tx.productUnit.upsert({
        where: { productId_code: { productId: product.id, code: TICIMAX_IMPORT_UNIT } },
        create: { productId: product.id, code: TICIMAX_IMPORT_UNIT, name: "Ticimax satış birimi", conversionFactor: row.factor, notes: `1 Ticimax satış birimi = ${row.factor} ${row.unit}. Entegrasyon kendiliğinden etkinleştirilmez.` },
        update: { conversionFactor: row.factor, notes: `1 Ticimax satış birimi = ${row.factor} ${row.unit}. Entegrasyon kendiliğinden etkinleştirilmez.` },
      });
    }
    const after = await tx.product.findMany({ where: { id: { in: ids } }, select: productSelect, orderBy: { id: "asc" } });
    const audit = await tx.auditLog.create({ data: {
      userId, action: "PRODUCT_CATALOG_IMPORTED", entityType: "ProductImport", entityId: manifest.id,
      description: `${ids.length} ürün güncellendi. Stok miktarları, geçmiş işlemler ve KDV oranları değiştirilmedi.`,
      oldValue: JSON.stringify(before), newValue: JSON.stringify({ products: after, sourceRows: manifest.rows, createdSuppliers }),
    } });
    return { count: ids.length, alreadyApplied: false, auditId: audit.id };
  }, { maxWait: 10_000, timeout: 45_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
