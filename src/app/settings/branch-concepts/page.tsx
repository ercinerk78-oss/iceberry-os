import { Palette, Power } from "lucide-react";

import { toggleBranchConcept } from "@/app/settings/branch-concepts/actions";
import { AppShell } from "@/components/app-shell";
import { BranchConceptForm } from "@/components/settings/branch-concept-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BranchConceptsPage() {
  await requirePermission("settings");
  const concepts = await prisma.branchConcept.findMany({
    include: { _count: { select: { branches: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <AppShell activeHref="/settings/branch-concepts" eyebrow="Sistem ayarları" title="Şube Konseptleri">
      <div className="space-y-5">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="size-5 text-[#2f5f20]" />
              Yeni Konsept
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BranchConceptForm />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {concepts.map((concept) => (
            <Card key={concept.id} className="shadow-none">
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base">
                  <span className="flex items-center gap-2">
                    <span className="size-3 rounded-full" style={{ backgroundColor: concept.color }} />
                    {concept.name}
                    <Badge variant="outline">{concept.code}</Badge>
                    <Badge variant={concept.isActive ? "secondary" : "outline"}>{concept.isActive ? "Aktif" : "Pasif"}</Badge>
                    <Badge variant="outline">{concept._count.branches} şube</Badge>
                  </span>
                  <form action={toggleBranchConcept.bind(null, concept.id)}>
                    <Button size="sm" variant="outline">
                      <Power className="size-4" />
                      {concept.isActive ? "Pasife Al" : "Aktifleştir"}
                    </Button>
                  </form>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BranchConceptForm concept={concept} />
              </CardContent>
            </Card>
          ))}
          {!concepts.length ? (
            <Card className="p-10 text-center text-sm text-[#65705f] shadow-none">Henüz şube konsepti yok.</Card>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
