import Link from "next/link";
import { PlugZap, ShieldCheck, UsersRound } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requirePermission("settings");

  const sections = [
    {
      title: "Kullanıcılar",
      description: "Kullanıcı hesapları, roller ve erişim durumları.",
      href: "/settings/users",
      icon: UsersRound,
    },
    {
      title: "Entegrasyon Ayarları",
      description: "Meta, WhatsApp, Ticimax ve Paraşüt bağlantı ayarları.",
      href: "/settings/integrations",
      icon: PlugZap,
    },
    {
      title: "Yetki Özeti",
      description: "Rol bazlı modül erişimleri ve güvenlik kapsamı.",
      href: "/settings/users",
      icon: ShieldCheck,
    },
  ];

  return (
    <AppShell activeHref="/settings" eyebrow="Sistem yapılandırması" title="Ayarlar">
      <div className="grid gap-4 md:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.title} href={section.href} className="block">
            <Card className="h-full shadow-none transition hover:border-[#6fbe44]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <section.icon className="size-5 text-[#2f5f20]" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-[#65705f]">{section.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
