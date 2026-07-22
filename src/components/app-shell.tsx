import Link from "next/link";
import {
  Bell,
  Search,
  Sparkles,
} from "lucide-react";

import { logout } from "@/app/login/actions";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { MobileNavigation, type MobileNavigationGroup, type MobileNavigationItem } from "@/components/mobile-navigation";
import { SidebarNavigation, type SidebarNavigationGroup, type SidebarNavigationItem } from "@/components/sidebar-navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getTranslations } from "@/lib/i18n/server";
import { visibleNavigationForRole } from "@/lib/navigation";

type AppShellProps = {
  activeHref: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
};

export async function AppShell({
  activeHref,
  eyebrow,
  title,
  children,
  action,
}: AppShellProps) {
  const user = await requireUser();
  const { locale, t } = await getTranslations();
  const visibleNavigation = visibleNavigationForRole(user.role);
  const dashboard = visibleNavigation.dashboard
    ? ({ ...visibleNavigation.dashboard, label: t(visibleNavigation.dashboard.key) } satisfies SidebarNavigationItem)
    : null;
  const navigationGroups = visibleNavigation.groups.map((group) => ({
    ...group,
    label: t(group.key),
    children: group.children.map((item) => ({ ...item, label: t(item.key) })),
  })) satisfies SidebarNavigationGroup[];
  const mobileDashboard = dashboard satisfies MobileNavigationItem | null;
  const mobileGroups = navigationGroups satisfies MobileNavigationGroup[];

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-[#1b1f1c]">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-[#dfe4dc] bg-[#17201b] px-4 py-5 text-white lg:flex lg:flex-col">
          <Link href="/dashboard" className="flex items-center gap-3 px-2">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#a8ff60] text-[#17201b]">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a8ff60]">
                {t("app.brand")}
              </p>
              <h1 className="text-xl font-semibold">{t("app.panel")}</h1>
            </div>
          </Link>

          <SidebarNavigation key={activeHref} dashboard={dashboard} groups={navigationGroups} activeHref={activeHref} />

          <div className="mt-auto rounded-lg border border-white/12 bg-white/8 p-4">
            <Badge className="bg-[#a8ff60] text-[#17201b] hover:bg-[#a8ff60]">
              {t("app.productBadge")}
            </Badge>
            <p className="mt-3 text-sm leading-6 text-white/74">
              {t("app.sidebarHint")}
            </p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-[#dfe4dc] bg-[#f6f7f4]/92 px-4 py-4 backdrop-blur md:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <MobileNavigation key={activeHref} dashboard={mobileDashboard} groups={mobileGroups} activeHref={activeHref} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#65705f]">{eyebrow}</p>
                  <h2 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">
                    {title}
                  </h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="hidden h-10 items-center gap-2 rounded-lg border border-[#d3d9cf] bg-white px-3 text-sm text-[#65705f] md:flex">
                  <Search className="size-4" />
                  {t("app.searchPlaceholder")}
                </div>
                {action}
                <LanguageSwitcher
                  locale={locale}
                  labels={{ label: t("language.label"), tr: t("language.tr"), en: t("language.en") }}
                />
                <Button size="icon" variant="outline" className="size-10 bg-white">
                  <Bell className="size-4" />
                </Button>
                {user ? (
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-semibold">{user.name}</p>
                    <p className="text-xs text-[#65705f]">
                      {t(`roles.${user.role}`, user.role)}
                    </p>
                  </div>
                ) : null}
                {user ? (
                  <form action={logout}>
                    <Button variant="outline">{t("app.logout")}</Button>
                  </form>
                ) : null}
                <Avatar className="size-10">
                  <AvatarFallback className="bg-[#17201b] text-white">
                    {user?.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2) ?? "IB"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          <div className="p-4 md:p-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
