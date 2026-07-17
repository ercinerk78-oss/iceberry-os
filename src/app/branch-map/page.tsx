import Link from "next/link";
import { MapPinned, Store } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BranchMapPage() {
  await requirePermission("branches");
  const branches = await safe(
    prisma.branch.findMany({
      where: { archivedAt: null },
      select: {
        id: true,
        branchName: true,
        city: true,
        district: true,
        status: true,
        openingDate: true,
      },
      orderBy: [{ city: "asc" }, { branchName: "asc" }],
      take: 120,
    }),
    [],
  );
  const cityGroups = branches.reduce<Record<string, typeof branches>>((acc, branch) => {
    const city = branch.city || "Şehir belirtilmedi";
    acc[city] = [...(acc[city] ?? []), branch];
    return acc;
  }, {});

  return (
    <AppShell activeHref="/branch-map" eyebrow="Şube ağı görünümü" title="Şube Haritası">
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card className="min-h-[520px] overflow-hidden shadow-none">
          <div className="flex h-full min-h-[520px] items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#e8f5df,transparent_28%),linear-gradient(135deg,#f8faf6,#eef4e9)] p-8">
            <div className="max-w-xl text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#17201b] text-white">
                <MapPinned className="size-8" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold">Türkiye şube dağılımı</h2>
              <p className="mt-3 text-sm leading-6 text-[#65705f]">
                Harita görünümü için canlı harita sağlayıcısı bağlanana kadar şehir bazlı şube listesi bu ekranda çalışır.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <MiniStat label="Şehir" value={Object.keys(cityGroups).length} />
                <MiniStat label="Şube" value={branches.length} />
                <MiniStat label="Aktif" value={branches.filter((item) => item.status === "ACTIVE").length} />
              </div>
            </div>
          </div>
        </Card>

        <aside className="space-y-4">
          {Object.entries(cityGroups).map(([city, rows]) => (
            <Card key={city} className="shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{city}</span>
                  <Badge variant="secondary">{rows.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {rows.map((branch) => (
                  <Link key={branch.id} href={`/branches/${branch.id}`} className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-[#f8faf6]">
                    <span className="flex min-w-0 items-center gap-2">
                      <Store className="size-4 shrink-0 text-[#2f5f20]" />
                      <span className="truncate font-medium">{branch.branchName}</span>
                    </span>
                    <span className="text-xs text-[#65705f]">{branch.district || branch.status}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ))}
          {!branches.length ? <Card className="p-8 text-center text-sm text-[#65705f] shadow-none">Henüz şube kaydı yok.</Card> : null}
        </aside>
      </div>
    </AppShell>
  );
}

async function safe<T>(promise: Promise<T>, fallback: T) {
  try {
    return await promise;
  } catch (error) {
    console.error("[branch-map] data load failed", error);
    return fallback;
  }
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white/80 p-4">
      <p className="text-xs font-medium uppercase text-[#65705f]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value.toLocaleString("tr-TR")}</p>
    </div>
  );
}
