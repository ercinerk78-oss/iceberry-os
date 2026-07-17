import { AppShell } from "@/components/app-shell";
import { OpeningForm } from "@/components/openings/opening-form";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewOpening() {
  const [branches, templates, users] = await Promise.all([
    prisma.branch.findMany({
      where: {
        archivedAt: null,
        status: { in: ["PLANNED", "SETUP", "IN_SETUP", "CONTRACTED"] },
        openingProjects: { none: { archivedAt: null, status: { notIn: ["COMPLETED", "CANCELLED"] } } },
      },
      select: { id: true, branchName: true, city: true },
      orderBy: { branchName: "asc" },
    }),
    prisma.openingProjectTemplate.findMany({
      where: { status: "PUBLISHED", archivedAt: null },
      select: { id: true, name: true, version: true },
      orderBy: [{ isDefault: "desc" }, { version: "desc" }],
    }),
    prisma.user.findMany({
      where: { isActive: true, archivedAt: null },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AppShell activeHref="/openings" eyebrow="Yeni proje" title="Yeni Açılış Projesi">
      <Card className="shadow-none">
        <CardContent className="p-5">
          {branches.length ? (
            <OpeningForm branches={branches} templates={templates} users={users} />
          ) : (
            <p className="p-10 text-center text-[#65705f]">
              Aktif projesi olmayan planlanmış veya kurulumdaki şube bulunamadı.
            </p>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
