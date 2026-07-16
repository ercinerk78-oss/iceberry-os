import { createBranch } from "@/app/branches/actions";
import { AppShell } from "@/components/app-shell";
import { BranchForm } from "@/components/branches/branch-form";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function NewBranchPage() {
  return (
    <AppShell activeHref="/branches" eyebrow="Ana işletme kaydı" title="Yeni Şube Ekle">
      <Card className="shadow-none">
        <CardContent className="p-5">
          <BranchForm action={createBranch} cancelHref="/branches" />
        </CardContent>
      </Card>
    </AppShell>
  );
}
