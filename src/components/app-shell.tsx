import Link from "next/link";
import {
  Bell,
  Building2,
  CalendarRange,
  CheckSquare,
  Columns3,
  FolderOpen,
  LayoutDashboard,
  LineChart,
  MapPinned,
  MessageSquareText,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  UsersRound,
  Warehouse,
} from "lucide-react";

import { logout } from "@/app/login/actions";
import { MobileNavigation, type MobileNavigationItem } from "@/components/mobile-navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import {
  hasPermission,
  ROLE_LABELS,
  type Permission,
  type UserRole,
} from "@/lib/permissions";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, iconKey: "LayoutDashboard" },
  { label: "Lead Havuzu", href: "/leads", icon: MessageSquareText, iconKey: "MessageSquareText" },
  { label: "Franchise Adayları", href: "/candidates", icon: UsersRound, iconKey: "UsersRound" },
  { label: "Satış Pipeline", href: "/pipeline", icon: Columns3, iconKey: "Columns3" },
  { label: "Görevler", href: "/tasks", icon: CheckSquare, iconKey: "CheckSquare" },
  { label: "Dokümanlar", href: "/documents", icon: FolderOpen, iconKey: "FolderOpen" },
  { label: "Bayiler", href: "/franchisees", icon: Building2, iconKey: "Building2" },
  { label: "Şubeler", href: "/branches", icon: Store, iconKey: "Store" },
  { label: "Açılış Yönetimi", href: "/openings", icon: CalendarRange, iconKey: "CalendarRange" },
  { label: "Sipariş Ver", href: "/orders", icon: ShoppingCart, iconKey: "ShoppingCart" },
  { label: "Sipariş Yönetimi", href: "/orders/admin", icon: Package, iconKey: "Package" },
  { label: "Depo", href: "/warehouse", icon: Warehouse, iconKey: "Warehouse" },
  { label: "Depo Stokları", href: "/warehouse/stock", icon: Warehouse, iconKey: "Warehouse" },
  { label: "Hazırlanacak Siparişler", href: "/warehouse/orders", icon: Package, iconKey: "Package" },
  { label: "Sevkiyatlar", href: "/warehouse/shipments", icon: Truck, iconKey: "Truck" },
  { label: "Stok Hareketleri", href: "/warehouse/movements", icon: LineChart, iconKey: "LineChart" },
  { label: "Şube Haritası", href: "#", icon: MapPinned, iconKey: "MapPinned" },
  { label: "Raporlar", href: "#", icon: LineChart, iconKey: "LineChart" },
  { label: "Ayarlar", href: "/settings", icon: Settings, iconKey: "Settings" },
  { label: "Kullanıcı Yönetimi", href: "/settings/users", icon: UsersRound, iconKey: "UsersRound" },
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
  const visibleNavigation = navigation.filter(
    (item) => !user || hasPermission(user.role, permissionFor(item.href)),
  );
  const mobileNavigation: MobileNavigationItem[] = visibleNavigation
    .filter((item) => item.href !== "#")
    .map((item) => ({
      label: item.label,
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
                Iceberry
              </p>
              <h1 className="text-xl font-semibold">OS Panel</h1>
            </div>
          </Link>

          <nav className="mt-8 space-y-1">
            {visibleNavigation.map((item) => {
              const active = item.href === activeHref;

              return (
                <Link
                  href={item.href}
                  key={item.label}
                  className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                    active
                      ? "bg-white text-[#17201b] shadow-sm"
                      : "text-white/72 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-lg border border-white/12 bg-white/8 p-4">
            <Badge className="bg-[#a8ff60] text-[#17201b] hover:bg-[#a8ff60]">
              Franchise CRM
            </Badge>
            <p className="mt-3 text-sm leading-6 text-white/74">
              Aday yönetimi, takip akışı ve şube açılış operasyonları tek
              merkezde.
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
                  Aday, şehir veya lead ara
                </div>
                {action}
                <Button size="icon" variant="outline" className="size-10 bg-white">
                  <Bell className="size-4" />
                </Button>
                {user ? (
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-semibold">{user.name}</p>
                    <p className="text-xs text-[#65705f]">
                      {ROLE_LABELS[user.role as UserRole]}
                    </p>
                  </div>
                ) : null}
                {user ? (
                  <form action={logout}>
                    <Button variant="outline">Çıkış</Button>
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
                      key={item.label}
                      className={`flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium ${
                        active ? "bg-[#17201b] text-white" : "bg-white text-[#65705f]"
                      }`}
                    >
                      <item.icon className="size-4" />
                      {item.label}
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
  if (href.startsWith("/candidates")) return "candidates";
  if (href.startsWith("/pipeline")) return "pipeline";
  if (href.startsWith("/tasks")) return "tasks";
  if (href.startsWith("/documents")) return "documents";
  if (href.startsWith("/franchisees")) return "franchisees";
  if (href.startsWith("/branches")) return "branches";
  if (href.startsWith("/openings")) return "openings";
  if (href.startsWith("/orders/admin")) return "order_admin";
  if (href.startsWith("/orders")) return "orders";
  if (href.startsWith("/warehouse")) return "warehouse";
  if (href.startsWith("/settings/users")) return "users";
  if (href.startsWith("/settings")) return "settings";
  if (href.startsWith("/reports")) return "reports";

  return "dashboard";
}
