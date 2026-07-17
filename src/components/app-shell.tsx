import Link from "next/link";
import {
  Bell,
  CalendarCheck2,
  CalendarRange,
  ClipboardCheck,
  CheckSquare,
  Columns3,
  FolderOpen,
  LayoutDashboard,
  LineChart,
  Landmark,
  MapPinned,
  MessageSquareText,
  Package,
  PlugZap,
  Search,
  Settings,
  ShoppingCart,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  UsersRound,
  Warehouse,
} from "lucide-react";

import { logout } from "@/app/login/actions";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { MobileNavigation, type MobileNavigationItem } from "@/components/mobile-navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getTranslations } from "@/lib/i18n/server";
import { hasPermission, type Permission } from "@/lib/permissions";

const navigation = [
  { key: "navigation.dashboard", href: "/dashboard", icon: LayoutDashboard, iconKey: "LayoutDashboard" },
  { key: "navigation.leads", href: "/leads", icon: MessageSquareText, iconKey: "MessageSquareText" },
  { key: "navigation.appointments", href: "/appointments", icon: CalendarCheck2, iconKey: "CalendarCheck2" },
  { key: "navigation.candidates", href: "/candidates", icon: UsersRound, iconKey: "UsersRound" },
  { key: "navigation.locations", href: "/locations", icon: MapPinned, iconKey: "MapPinned" },
  { key: "navigation.pipeline", href: "/pipeline", icon: Columns3, iconKey: "Columns3" },
  { key: "navigation.tasks", href: "/tasks", icon: CheckSquare, iconKey: "CheckSquare" },
  { key: "navigation.branchPortal", href: "/branch-portal", icon: ClipboardCheck, iconKey: "CheckSquare" },
  { key: "navigation.documents", href: "/documents", icon: FolderOpen, iconKey: "FolderOpen" },
  { key: "navigation.branches", href: "/branches", icon: Store, iconKey: "Store" },
  { key: "navigation.branchRevenues", href: "/branch-revenues", icon: LineChart, iconKey: "LineChart" },
  { key: "navigation.openings", href: "/openings", icon: CalendarRange, iconKey: "CalendarRange" },
  { key: "navigation.orders", href: "/orders", icon: ShoppingCart, iconKey: "ShoppingCart" },
  { key: "navigation.orderAdmin", href: "/orders/admin", icon: Package, iconKey: "Package" },
  { key: "navigation.warehouse", href: "/warehouse", icon: Warehouse, iconKey: "Warehouse" },
  { key: "navigation.stock", href: "/warehouse/stock", icon: Warehouse, iconKey: "Warehouse" },
  { key: "navigation.goodsReceipts", href: "/warehouse/goods-receipts", icon: ClipboardCheck, iconKey: "CheckSquare" },
  { key: "navigation.lots", href: "/warehouse/lots", icon: CalendarRange, iconKey: "CalendarRange" },
  { key: "navigation.counts", href: "/warehouse/counts", icon: CheckSquare, iconKey: "CheckSquare" },
  { key: "navigation.productMappings", href: "/warehouse/product-mappings", icon: Package, iconKey: "Package" },
  { key: "navigation.compliance", href: "/warehouse/compliance", icon: Bell, iconKey: "Bell" },
  { key: "navigation.warehouseOrders", href: "/warehouse/orders", icon: Package, iconKey: "Package" },
  { key: "navigation.shipments", href: "/warehouse/shipments", icon: Truck, iconKey: "Truck" },
  { key: "navigation.movements", href: "/warehouse/movements", icon: LineChart, iconKey: "LineChart" },
  { key: "navigation.integrations", href: "/integrations", icon: PlugZap, iconKey: "Settings" },
  { key: "navigation.finance", href: "/finance", icon: Landmark, iconKey: "LineChart" },
  { key: "navigation.operations", href: "/operations", icon: ShieldCheck, iconKey: "CheckSquare" },
  { key: "navigation.branchMap", href: "#", icon: MapPinned, iconKey: "MapPinned" },
  { key: "navigation.reports", href: "#", icon: LineChart, iconKey: "LineChart" },
  { key: "navigation.settings", href: "/settings", icon: Settings, iconKey: "Settings" },
  { key: "navigation.users", href: "/settings/users", icon: UsersRound, iconKey: "UsersRound" },
] as const;

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
  const visibleNavigation = navigation.filter(
    (item) => !user || hasPermission(user.role, permissionFor(item.href)),
  );
  const mobileNavigation: MobileNavigationItem[] = visibleNavigation
    .filter((item) => item.href !== "#")
    .map((item) => ({
      label: t(item.key),
      href: item.href,
      icon: item.iconKey,
    }));

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

          <nav className="mt-8 space-y-1 overflow-y-auto pr-1">
            {visibleNavigation.map((item) => {
              const active = item.href === activeHref;

              return (
                <Link
                  href={item.href}
                  key={item.key}
                  className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                    active
                      ? "bg-white text-[#17201b] shadow-sm"
                      : "text-white/72 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <item.icon className="size-4" />
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>

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
                <MobileNavigation items={mobileNavigation} activeHref={activeHref} />
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

            <nav className="relative z-20 mt-4 flex gap-2 overflow-x-auto lg:hidden">
              {visibleNavigation
                .filter((item) => item.href !== "#")
                .slice(0, 6)
                .map((item) => {
                  const active = item.href === activeHref;

                  return (
                    <Link
                      href={item.href}
                      key={item.key}
                      className={`flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium ${
                        active ? "bg-[#17201b] text-white" : "bg-white text-[#65705f]"
                      }`}
                    >
                      <item.icon className="size-4" />
                      {t(item.key)}
                    </Link>
                  );
                })}
            </nav>
          </header>

          <div className="p-4 md:p-8">{children}</div>
        </section>
      </div>
    </main>
  );
}

function permissionFor(href: string): Permission {
  if (href === "/dashboard" || href === "/") return "dashboard";
  if (href.startsWith("/leads")) return "leads";
  if (href.startsWith("/branch-portal")) return "branch_portal";
  if (href.startsWith("/appointments")) return "appointments";
  if (href.startsWith("/candidates")) return "candidates";
  if (href.startsWith("/locations")) return "locations.view";
  if (href.startsWith("/pipeline")) return "pipeline";
  if (href.startsWith("/tasks")) return "tasks";
  if (href.startsWith("/documents")) return "documents";
  if (href.startsWith("/franchisees")) return "franchisees";
  if (href.startsWith("/branches")) return "branches";
  if (href.startsWith("/branch-revenues")) return "branch_revenue";
  if (href.startsWith("/openings")) return "openings";
  if (href.startsWith("/orders/admin")) return "order_admin";
  if (href.startsWith("/orders")) return "orders";
  if (href.startsWith("/warehouse")) return "warehouse";
  if (href.startsWith("/integrations")) return "integrations";
  if (href.startsWith("/settings/users")) return "users";
  if (href.startsWith("/settings")) return "settings";
  if (href.startsWith("/reports")) return "reports";

  return "dashboard";
}
