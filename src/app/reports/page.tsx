import Link from "next/link";
import { BarChart3, CalendarCheck2, FileText, LineChart, Store, Target } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requirePermission("reports");
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [leadCount, appointmentCount, branchCount, openingCount, revenueRows, documentCount, branchConcepts] = await Promise.all([
    safe(prisma.lead.count(), 0),
    safe(prisma.leadAppointment.count(), 0),
    safe(prisma.branch.count({ where: { archivedAt: null } }), 0),
    safe(prisma.openingProject.count({ where: { archivedAt: null } }), 0),
    safe(prisma.branchRevenueRecord.findMany({
      where: { periodStart: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
      select: { netRevenue: true },
    }), []),
    safe(prisma.document.count({ where: { archivedAt: null } }), 0),
    safe(prisma.branchConcept.findMany({
      select: {
        id: true,
        name: true,
        color: true,
        branches: { where: { archivedAt: null }, select: { status: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }), []),
  ]);
  const revenueTotal = revenueRows.reduce((sum, row) => sum + (row.netRevenue ?? 0), 0);
  const cards = [
    { title: "Lead Raporu", value: leadCount, href: "/leads", icon: Target, note: "Lead havuzu ve randevu dönüşümü" },
    { title: "Randevu Raporu", value: appointmentCount, href: "/appointments", icon: CalendarCheck2, note: "Planlanan ve tamamlanan görüşmeler" },
    { title: "Şube Raporu", value: branchCount, href: "/branches", icon: Store, note: "Aktif ve toplam şube görünümü" },
    { title: "Açılış Raporu", value: openingCount, href: "/openings", icon: BarChart3, note: "Kurulum projeleri ve aşamalar" },
    { title: "Ciro Raporu", value: revenueTotal, href: "/branch-revenues", icon: LineChart, note: "Bu ay kayıtlı net ciro" },
    { title: "Doküman Raporu", value: documentCount, href: "/documents", icon: FileText, note: "Aktif doküman kayıtları" },
  ];

  return (
    <AppShell activeHref="/reports" eyebrow="Yönetim raporları" title="Raporlar">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.title} href={card.href} className="block">
            <Card className="h-full shadow-none transition hover:border-[#6fbe44]">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3 text-base">
                  <span className="flex items-center gap-2">
                    <card.icon className="size-5 text-[#2f5f20]" />
                    {card.title}
                  </span>
                  <Badge variant="secondary">{formatValue(card.value)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-[#65705f]">{card.note}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <Card className="mt-5 p-4 text-sm text-[#65705f] shadow-none">
        Rapor sekmesi canlı modüllere bağlandı. Detaylı filtreler için ilgili modül kartına tıklayın.
        <span className="ml-2">Gün başlangıcı: {startOfDay.toLocaleDateString("tr-TR")}</span>
      </Card>
      <Card className="mt-5 p-4 shadow-none">
        <h2 className="font-semibold">Konsept Bazlı Şube Özeti</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {branchConcepts.map((concept) => {
            const active = concept.branches.filter((branch) => branch.status === "ACTIVE").length;
            const opening = concept.branches.filter((branch) => ["PLANNED", "IN_SETUP", "READY_TO_OPEN", "CONTRACTED"].includes(branch.status)).length;

            return (
              <Link key={concept.id} href={`/branches?concept=${concept.id}`} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4 hover:border-[#17201b]">
                <span className="inline-flex items-center gap-2 font-medium">
                  <span className="size-3 rounded-full" style={{ backgroundColor: concept.color }} />
                  {concept.name}
                </span>
                <p className="mt-3 text-2xl font-semibold">{formatValue(concept.branches.length)}</p>
                <p className="text-sm text-[#65705f]">Aktif: {formatValue(active)} · Açılış: {formatValue(opening)}</p>
              </Link>
            );
          })}
        </div>
      </Card>
    </AppShell>
  );
}

async function safe<T>(promise: Promise<T>, fallback: T) {
  try {
    return await promise;
  } catch (error) {
    console.error("[reports] metric fallback", error);
    return fallback;
  }
}

function formatValue(value: number) {
  return value.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}
