import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { parseProductImport, parseCountImport } from "@/lib/product-import";
import { previewStockCutover, applyStockCutover } from "@/lib/stock-cutover-service";
import { applyProductImport, previewProductImport, releaseConfirmedArchivedSku } from "@/lib/product-import-service";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(request: NextRequest) {
  const user = await requirePermission("stock_manage");
  if (user.role !== "GENERAL_MANAGER") return NextResponse.json({ error: "Bu kontrol yalnız Genel Müdür tarafından yapılabilir." }, { status: 403 });
  const codes = request.nextUrl.searchParams.getAll("sku");
  if (!codes.length || codes.length > 3 || codes.some(code => !code || code.length > 120)) return NextResponse.json({ error: "En fazla üç SKU ile kontrol yapılabilir." }, { status: 400 });
  const products = await prisma.product.findMany({
    where: { sku: { in: codes } },
    select: {
      id: true, name: true, sku: true, isActive: true, archivedAt: true,
      stocks: { select: { quantity: true, reservedQuantity: true, availableQuantity: true } },
      _count: { select: { orderItems: true, purchaseOrderItems: true, goodsReceiptItems: true, movements: true } },
    },
    orderBy: { sku: "asc" },
  });
  return NextResponse.json({ products }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("stock_manage");
    if (user.role !== "GENERAL_MANAGER") return NextResponse.json({ error: "Toplu aktarım yalnız Genel Müdür tarafından yapılabilir." }, { status: 403 });
    if (request.headers.get("x-iceberry-import") !== "1" || request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "İstek doğrulanamadı." }, { status: 403 });
    const form = await request.formData();
    if (form.get("mode") === "release-archived-sku" && form.get("confirmed") === "yes") {
      const result = await releaseConfirmedArchivedSku(user.id, String(form.get("code") || "056"));
      revalidatePath("/settings/product-import");
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    }
    if (form.get("mode") === "count-preview") {
      const file = form.get("file");
      if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx") || !file.size || file.size > 1_048_576) throw new Error("En fazla 1 MB boyutunda sayım XLSX dosyası seçin.");
      return NextResponse.json(await previewStockCutover(await parseCountImport(await file.arrayBuffer()), user.id), { headers: { "Cache-Control": "no-store" } });
    }
    if (form.get("mode") === "count-apply" && form.get("confirmed") === "yes") {
      const result = await applyStockCutover(String(form.get("token") || ""), user.id);
      for (const path of ["/orders", "/orders/admin", "/warehouse/stock", "/warehouse/counts", "/warehouse/shipments", "/warehouse/orders", "/warehouse/movements", "/warehouse/profitability"]) revalidatePath(path);
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    }
    if (form.get("mode") === "preview") {
      const file = form.get("file");
      if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx") || !file.size || file.size > 1_048_576) throw new Error("En fazla 1 MB boyutunda bir XLSX dosyası seçin.");
      const choices = z.record(z.string().max(200), z.string().max(200)).parse(JSON.parse(String(form.get("choices") || "{}")));
      const rows = await parseProductImport(await file.arrayBuffer());
      return NextResponse.json(await previewProductImport(rows, choices, user.id), { headers: { "Cache-Control": "no-store" } });
    }
    if (form.get("mode") !== "apply" || form.get("confirmed") !== "yes") throw new Error("Önizlemeyi kontrol edip aktarımı onaylayın.");
    const result = await applyProductImport(String(form.get("token") || ""), user.id);
    for (const path of ["/warehouse/stock", "/warehouse/barcodes", "/orders", "/procurement/suppliers", "/procurement/orders/new", "/settings/product-import"]) revalidatePath(path);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Product import database error", error.code);
      if (error.code === "P2028") {
        console.error("Product import transaction timeout", error.meta?.error);
        return NextResponse.json({ error: "Veritabanı işlemi zaman aşımına uğradı ve geri alındı. Hiçbir toplu değişiklik uygulanmadı; yeniden önizleyin." }, { status: 409 });
      }
      return NextResponse.json({ error: "Veritabanı değişikliği tamamlanamadı; işlem geri alındı. Yeniden önizleyin." }, { status: 409 });
    }
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Dosya veya tedarikçi seçimleri geçersiz." }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Aktarım tamamlanamadı." }, { status: 400 });
  }
}
