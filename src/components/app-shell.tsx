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
  Search,
  Settings,
  Sparkles,
  Store,
  Package,
  ShoppingCart,
  Truck,
  Warehouse,
  UsersRound,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { hasPermission, ROLE_LABELS, type Permission, type UserRole } from "@/lib/permissions";
import { logout } from "@/app/login/actions";

const navigation = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Lead Havuzu", href: "/leads", icon: MessageSquareText },
  { label: "Franchise Adayları", href: "/candidates", icon: UsersRound },
  { label: "Satış Pipeline", href: "/pipeline", icon: Columns3 },
  { label: "Görevler", href: "/tasks", icon: CheckSquare },
  { label: "Dokümanlar", href: "/documents", icon: FolderOpen },
  { label: "Bayiler", href: "/franchisees", icon: Building2 },
  { label: "Şubeler", href: "/branches", icon: Store },
  { label: "Açılış Yönetimi", href: "/openings", icon: CalendarRange },
  { label: "Sipariş Ver", href: "/orders", icon: ShoppingCart },
  { label: "Sipariş Yönetimi", href: "/orders/admin", icon: Package },
  { label: "Depo Stokları", href: "/warehouse/stock", icon: Warehouse },
  { label: "Hazırlanacak Siparişler", href: "/warehouse/orders", icon: Package },
  { label: "Sevkiyatlar", href: "/warehouse/shipments", icon: Truck },
  { label: "Stok Hareketleri", href: "/warehouse/movements", icon: LineChart },
  { label: "Şube Haritası", href: "#", icon: MapPinned },
  { label: "Raporlar", href: "#", icon: LineChart },
  { label: "Ayarlar", href: "/settings", icon: Settings },
  { label: "Kullanıcı Yönetimi", href: "/settings/users", icon: UsersRound },
];

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
  const visibleNavigation = navigation.filter((item) => !user || hasPermission(user.role, permissionFor(item.href)));
  return (
    <main className="min-h-screen bg-[#f6f7f4] text-[#1b1f1c]">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-[#dfe4dc] bg-[#17201b] px-4 py-5 text-white lg:flex lg:flex-col">
          <Link href="/" className="flex items-center gap-3 px-2">
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
          <header className="sticky top-0 z-10 border-b border-[#dfe4dc] bg-[#f6f7f4]/92 px-4 py-4 backdrop-blur md:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#17201b] text-[#a8ff60] lg:hidden">
                  <Sparkles className="size-5" />
                </div>
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
                {user ? <div className="hidden text-right sm:block"><p className="text-sm font-semibold">{user.name}</p><p className="text-xs text-[#65705f]">{ROLE_LABELS[user.role as UserRole]}</p></div> : null}
                {user ? <form action={logout}><Button variant="outline">Çıkış</Button></form> : null}
                <Avatar className="size-10">
                  <AvatarFallback className="bg-[#17201b] text-white">
                    {user?.name.split(" ").map(x=>x[0]).join("").slice(0,2) ?? "IB"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
            <nav className="mt-4 flex gap-2 overflow-x-auto lg:hidden">
              {visibleNavigation.map((item) => {
                const active = item.href === activeHref;

                return (
                  <Link
                    href={item.href}
                    key={item.label}
                    className={`flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium ${
                      active
                        ? "bg-[#17201b] text-white"
                        : "bg-white text-[#65705f]"
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

function permissionFor(href:string):Permission{if(href.startsWith("/leads"))return"leads";if(href.startsWith("/candidates"))return"candidates";if(href.startsWith("/pipeline"))return"pipeline";if(href.startsWith("/tasks"))return"tasks";if(href.startsWith("/documents"))return"documents";if(href.startsWith("/franchisees"))return"franchisees";if(href.startsWith("/branches"))return"branches";if(href.startsWith("/openings"))return"openings";if(href.startsWith("/orders/admin"))return"order_admin";if(href.startsWith("/orders"))return"orders";if(href.startsWith("/warehouse"))return"warehouse";if(href.startsWith("/settings/users"))return"users";if(href.startsWith("/settings"))return"settings";if(href.startsWith("/reports"))return"reports";return"dashboard"}
