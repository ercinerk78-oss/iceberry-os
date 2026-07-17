import { createBranch } from "@/app/branches/actions";
import { AppShell } from "@/components/app-shell";
import { BranchForm } from "@/components/branches/branch-form";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewBranchPage() {
  const owner = await prisma.franchisee.findFirst({
    where: { archivedAt: null },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell activeHref="/branches" eyebrow="Ana işletme kaydı" title="Yeni Şube Ekle">
      <Card className="shadow-none">
        <CardContent className="p-5">
          {owner ? (
            <BranchForm action={createBranch} cancelHref="/branches" values={{ franchiseeId: owner.id }} />
          ) : (
            <p className="p-10 text-center text-[#65705f]">
              Şube oluşturmak için veritabanında en az bir kurucu şube grubu kaydı bulunmalı.
            </p>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
