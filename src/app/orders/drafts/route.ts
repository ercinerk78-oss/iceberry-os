import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { hasPermissionWithOverrides } from "@/lib/permissions";
import { draftRequestSchema } from "@/lib/order-draft";
import { DraftConflict, saveOrderDraft } from "@/lib/order-draft-service";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Oturumunuz sona erdi. Tekrar giriş yapın; yerel taslağınız korunuyor." }, { status: 401 });
  const allowed = (permission: "orders" | "warehouse") => hasPermissionWithOverrides(user.role, permission, user.permissions);
  if (!allowed("orders")) return NextResponse.json({ error: "Bayi siparişleri yetkiniz yok." }, { status: 403 });
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("x-iceberry-draft") !== "1") return NextResponse.json({ error: "İstek doğrulanamadı." }, { status: 403 });
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 65536) return NextResponse.json({ error: "Taslak çok büyük." }, { status: 413 });
  try {
    const parsed = draftRequestSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return NextResponse.json({ error: "Taslak alanlarını ve ürün miktarlarını kontrol edin." }, { status: 400 });
    if (parsed.data.command === "submit" && !allowed("warehouse")) return NextResponse.json({ error: "Merkeze göndermek için depo onay yetkisi gerekiyor." }, { status: 403 });
    const result = await saveOrderDraft(parsed.data, user.id);
    if (parsed.data.command !== "save") for (const path of ["/orders", "/orders/admin"]) revalidatePath(path);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof DraftConflict || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")) return NextResponse.json({ error: error instanceof DraftConflict ? error.message : "Taslak eş zamanlı güncellendi. Yeniden açın; yerel değişiklikleriniz korunuyor." }, { status: 409 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Taslak verisi geçersiz." }, { status: 400 });
    if (error instanceof Prisma.PrismaClientKnownRequestError) { console.error("Order draft database error", error.code); return NextResponse.json({ error: "Taslak sunucuya kaydedilemedi. Değişiklikleriniz bu cihazda korunuyor." }, { status: 503 }); }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Taslak kaydedilemedi." }, { status: 400 });
  }
}
