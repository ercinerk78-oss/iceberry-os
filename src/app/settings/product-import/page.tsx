import { AppShell } from "@/components/app-shell";
import { ProductImportForm } from "@/components/settings/product-import-form";
import { requirePermission } from "@/lib/auth";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export default async function ProductImportPage() {
  const user = await requirePermission("stock_manage");
  if (user.role !== "GENERAL_MANAGER") notFound();
  return <AppShell activeHref="/settings" eyebrow="Ürün yönetimi" title="Excel Ürün Güncelleme"><ProductImportForm /></AppShell>;
}
