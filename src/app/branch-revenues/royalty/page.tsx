import Link from "next/link";
import { Prisma } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { RoyaltyCalculator } from "@/components/branch-revenues/royalty-calculator";
import { requirePermission } from "@/lib/auth";
import { accessibleBranchIds } from "@/lib/branch-access";
import { prisma } from "@/lib/prisma";
import { defaultRoyaltyPeriod, royaltyMonthSchema, royaltyInputsSchema, royaltySettingsSchema } from "@/lib/finance/delivery-royalty";

export const dynamic = "force-dynamic";

export default async function RoyaltyPage({ searchParams }: { searchParams: Promise<{ period?: string; branchId?: string }> }) {
  const user = await requirePermission("finance");
  const params = await searchParams;
  const parsedPeriod = royaltyMonthSchema.safeParse(params.period);
  const period = parsedPeriod.success ? parsedPeriod.data : defaultRoyaltyPeriod();
  const [year, month] = period.split("-").map(Number);
  const ids = await accessibleBranchIds(user.id, user.role);
  const branches = await prisma.branch.findMany({ where: { archivedAt: null, ownershipType: "FRANCHISE", ...(ids ? { id: { in: ids } } : {}) }, select: { id: true, branchName: true, updatedAt: true, royaltyCalculationSettings: true, financialProfile: { select: { royaltyRate: true } } }, orderBy: { branchName: "asc" } });
  const visible = branches.filter(branch => !params.branchId || branch.id === params.branchId);
  const revenues = await prisma.branchRevenueRecord.findMany({ where: { branchId: { in: visible.map(branch => branch.id) }, periodType: "MONTHLY", year, month, status: { in: ["DRAFT", "SUBMITTED", "APPROVED", "LOCKED"] } }, select: { id: true, branchId: true, grossRevenue: true, currency: true, status: true, updatedAt: true, royaltyCalculationInputs: true } });
  const branch = params.branchId ? visible[0] : null;
  const revenue = branch ? revenues.find(record => record.branchId === branch.id) : null;
  const settings = royaltySettingsSchema.safeParse(branch?.royaltyCalculationSettings);
  const saved = royaltyInputsSchema.safeParse(revenue?.royaltyCalculationInputs);
  const previousTotal = revenue?.royaltyCalculationInputs && typeof revenue.royaltyCalculationInputs === "object" && !Array.isArray(revenue.royaltyCalculationInputs) ? revenue.royaltyCalculationInputs.totalRevenue : undefined;
  const profileRate = branch?.financialProfile?.royaltyRate?.toNumber();
  const rate = saved.success ? saved.data.rate : settings.success ? settings.data.rate : profileRate === 2 ? 2 : 3;
  return <AppShell activeHref="/branch-revenues/royalty" eyebrow="Şubeler" title="Royalty Hesaplama">
    <form className="mb-6 flex flex-wrap items-end gap-3 border-b pb-5">
      <label className="text-sm">Royalty Dönemi<input aria-label="Royalty Dönemi" type="month" name="period" defaultValue={period} min="2000-01" max="2100-12" className="mt-1 block h-10 rounded-md border px-3" /></label>
      <label className="min-w-0 text-sm">Şube<select aria-label="Şube" name="branchId" defaultValue={params.branchId ?? ""} className="mt-1 block h-10 max-w-full rounded-md border px-3"><option value="">Tüm Şubeler</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.branchName}</option>)}</select></label>
      <Button type="submit">Göster</Button><Button asChild variant="outline"><Link href="/branch-revenues">Şube Ciroları</Link></Button>
    </form>
    <p className="mb-5 text-sm text-muted-foreground">Hesaplama kaydı · Tahakkuk veya fatura oluşturulmaz.</p>
    {params.period && !parsedPeriod.success && <p role="alert" className="mb-4 text-sm text-rose-700">Geçersiz dönem yerine önceki ay gösteriliyor.</p>}
    {branch && revenue && revenue.currency === "TRY" ? <RoyaltyCalculator key={`${revenue.id}-${revenue.updatedAt.toISOString()}-${branch.updatedAt.toISOString()}`} branchName={branch.branchName} revenueId={revenue.id} period={period} totalRevenue={new Prisma.Decimal(revenue.grossRevenue).toFixed(2)} revenueUpdatedAt={revenue.updatedAt.toISOString()} branchUpdatedAt={branch.updatedAt.toISOString()} rate={rate} deliveryRevenue={saved.success ? saved.data.deliveryRevenue : ""} startMonth={settings.success ? settings.data.startMonth : ""} exemptionNote={settings.success ? settings.data.exemptionNote : ""} revenueStatus={revenue.status} savedTotalRevenue={typeof previousTotal === "string" ? previousTotal : undefined} /> : branch ? <p role="status" className="border p-4">{!revenue ? "Bu şube ve dönem için ciro girilmemiş. Önce Şube Ciroları kaydını oluşturun." : "Bu hesaplama yalnız TL ciro kayıtları için kullanılabilir."}</p> : null}
    <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="border-b bg-muted"><tr>{["Şube", "Dönem Toplam Cirosu", "Paket Servis Cirosu", "İşlem"].map(title => <th className="p-3" key={title}>{title}</th>)}</tr></thead><tbody>{visible.map(branch => {
      const record = revenues.find(record => record.branchId === branch.id);
      const inputs = royaltyInputsSchema.safeParse(record?.royaltyCalculationInputs);
      const money = (value: number, currency: string) => `${value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
      return <tr key={branch.id} className="border-b"><td className="p-3 font-medium">{branch.branchName}</td><td className="p-3">{record ? money(record.grossRevenue, record.currency) : "Ciro girilmedi"}</td><td className="p-3">{inputs.success ? money(Number(inputs.data.deliveryRevenue), record!.currency) : "Giriş bekleniyor"}</td><td className="p-3"><Link className="font-medium underline" href={`/branch-revenues/royalty?period=${period}&branchId=${encodeURIComponent(branch.id)}`}>Hesaplamayı Aç</Link></td></tr>;
    })}{!visible.length && <tr><td colSpan={4} className="p-8 text-center">Şube bulunamadı.</td></tr>}</tbody></table></div>
  </AppShell>;
}
