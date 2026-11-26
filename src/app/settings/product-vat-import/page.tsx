import { requirePermission } from "@/lib/auth";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProductVatImportForm } from "@/components/settings/product-vat-import-form";
export const dynamic = "force-dynamic";
export default async function ProductVatImportPage() {
  const user = await requirePermission("stock_manage");
  if (user.role !== "GENERAL_MANAGER") notFound();
  return <AppShell activeHref="/settings" title="Ürün KDV Güncelleme" eyebrow="Ürün yönetimi"><ProductVatImportForm /></AppShell>;
}
