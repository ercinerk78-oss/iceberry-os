import {
  ArrowUpRight,
  Bell,
  Building2,
  CalendarClock,
  CalendarRange,
  CheckSquare,
  FolderOpen,
  CheckCircle2,
  ChevronRight,
  Columns3,
  LayoutDashboard,
  LineChart,
  MapPinned,
  MessageSquareText,
  Search,
  Settings,
  Sparkles,
  Store,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

import { MobileNavigation, type MobileNavigationItem } from "@/components/mobile-navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireUser } from "@/lib/auth";
import { hasPermission, ROLE_LABELS, routePermission, type UserRole } from "@/lib/permissions";
import { logout } from "@/app/login/actions";

const navigation = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, active: true },
  { label: "Lead Havuzu", href: "/leads", icon: MessageSquareText },
  { label: "Adaylar", href: "/candidates", icon: UsersRound },
  { label: "Satış Pipeline", href: "/pipeline", icon: Columns3 },
  { label: "Görevler", href: "/tasks", icon: CheckSquare },
  { label: "Dokümanlar", href: "/documents", icon: FolderOpen },
  { label: "Bayiler", href: "/franchisees", icon: Building2 },
  { label: "Şubeler", href: "/branches", icon: Store },
  { label: "Açılış Yönetimi", href: "/openings", icon: CalendarRange },
  { label: "Sipariş Ver", href: "/orders", icon: CheckSquare },
  { label: "Sipariş Yönetimi", href: "/orders/admin", icon: Store },
  { label: "Depo Stokları", href: "/warehouse/stock", icon: Store },
  { label: "Hazırlanacak Siparişler", href: "/warehouse/orders", icon: CheckSquare },
  { label: "Sevkiyatlar", href: "/warehouse/shipments", icon: ArrowUpRight },
  { label: "Stok Hareketleri", href: "/warehouse/movements", icon: LineChart },
  { label: "Şube Haritası", href: "#", icon: MapPinned },
  { label: "Raporlar", href: "#", icon: LineChart },
  { label: "Ayarlar", href: "#", icon: Settings },
  { label: "Kullanıcı Yönetimi", href: "/settings/users", icon: UsersRound },
];

const pipeline = [
  { stage: "Yeni Lead", count: 326, color: "bg-sky-500" },
  { stage: "Ön Görüşme", count: 188, color: "bg-emerald-500" },
  { stage: "Finansal Uygunluk", count: 96, color: "bg-amber-500" },
  { stage: "Sözleşme", count: 37, color: "bg-rose-500" },
];

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();
  const visibleNavigation = navigation.filter(item=>{const p=routePermission(item.href==="#"?"/settings":item.href);return !p||!user||hasPermission(user.role,p)});
  const mobileNavigation: MobileNavigationItem[] = visibleNavigation
    .filter((item) => item.href !== "#")
    .map((item) => ({
      label: item.label,
      href: item.href === "/" ? "/dashboard" : item.href,
      icon: mobileIconFor(item.href),
    }));
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const [totalLeads, todayLeads, todayInstagramLeads, todayFacebookLeads, pendingLeads, convertedLeads, followUpRecords, totalFranchisees, activeFranchisees, totalBranches, activeBranches, setupBranches, upcomingOpenings, ongoingOpeningProjects, delayedOpeningProjects, todayOpeningTasks, pendingOrders, warehouseOrders, lowStocks, shippedToday] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { leadDate: { gte: startOfDay, lt: endOfDay } } }),
    prisma.lead.count({ where: { source: "Instagram", leadDate: { gte: startOfDay, lt: endOfDay } } }),
    prisma.lead.count({ where: { source: "Facebook", leadDate: { gte: startOfDay, lt: endOfDay } } }),
    prisma.lead.count({ where: { status: { notIn: ["Reddedildi", "Adaya Dönüştürüldü"] } } }),
    prisma.lead.count({ where: { status: "Adaya Dönüştürüldü" } }),
    prisma.franchiseCandidate.findMany({ where: { archivedAt: null, nextFollowUpAt: { gte: startOfDay, lt: endOfDay } }, orderBy: { nextFollowUpAt: "asc" }, take: 5 }),
    prisma.franchisee.count({where:{archivedAt:null}}),
    prisma.franchisee.count({where:{archivedAt:null,status:"ACTIVE"}}),
    prisma.branch.count({where:{archivedAt:null}}),
    prisma.branch.count({where:{archivedAt:null,status:"ACTIVE"}}),
    prisma.branch.count({where:{archivedAt:null,status:"SETUP"}}),
    prisma.branch.count({where:{archivedAt:null,plannedOpeningDate:{gte:startOfDay,lte:new Date(now.getFullYear(),now.getMonth(),now.getDate()+30)}}}),
    prisma.branchOpening.count({where:{archivedAt:null,status:{notIn:["COMPLETED","CANCELLED"]}}}),
    prisma.branchOpening.count({where:{archivedAt:null,status:{notIn:["COMPLETED","CANCELLED"]},plannedOpeningDate:{lt:startOfDay}}}),
    prisma.openingTask.count({where:{status:{notIn:["COMPLETED","CANCELLED"]},dueDate:{gte:startOfDay,lt:endOfDay}}}),
    prisma.franchiseOrder.count({where:{status:"SUBMITTED"}}),
    prisma.franchiseOrder.count({where:{status:{in:["WAREHOUSE_QUEUE","PREPARING","READY"]}}}),
    prisma.warehouseStock.count({where:{availableQuantity:{lte:10}}}),
    prisma.shipment.count({where:{shippedAt:{gte:startOfDay,lt:endOfDay}}}),
  ]);
  const number = new Intl.NumberFormat("tr-TR");
  const time = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const metrics = [
    { title: "Toplam Lead", value: number.format(totalLeads), change: "Canlı", description: "Lead havuzundaki tüm kayıtlar", icon: UsersRound, tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    { title: "Bugün Gelen Lead", value: number.format(todayLeads), change: "Bugün", description: "Bugün alınan yeni talepler", icon: LineChart, tone: "bg-sky-50 text-sky-700 ring-sky-200" },
    { title: "Bugünkü Instagram Lead", value: number.format(todayInstagramLeads), change: "Instagram", description: "Bugün Instagram formlarından gelenler", icon: Sparkles, tone: "bg-pink-50 text-pink-700 ring-pink-200" },
    { title: "Bugünkü Facebook Lead", value: number.format(todayFacebookLeads), change: "Facebook", description: "Bugün Facebook formlarından gelenler", icon: MessageSquareText, tone: "bg-blue-50 text-blue-700 ring-blue-200" },
    { title: "Bekleyen Lead", value: number.format(pendingLeads), change: "İnceleniyor", description: "Karar veya temas bekleyenler", icon: CalendarClock, tone: "bg-amber-50 text-amber-700 ring-amber-200" },
    { title: "Dönüştürülen Lead", value: number.format(convertedLeads), change: "Adaylar", description: "Franchise adayına aktarılanlar", icon: CheckCircle2, tone: "bg-rose-50 text-rose-700 ring-rose-200" },
    { title: "Dönüşüm Oranı", value: `%${totalLeads ? Math.round(convertedLeads / totalLeads * 100) : 0}`, change: "Canlı", description: "Lead → aday dönüşümü", icon: Building2, tone: "bg-violet-50 text-violet-700 ring-violet-200" },
    { title: "Toplam Bayi", value:number.format(totalFranchisees),change:"Canlı",description:"Arşivlenmemiş bayi kayıtları",icon:Building2,tone:"bg-lime-50 text-lime-700 ring-lime-200"},
    { title: "Aktif Bayi", value:number.format(activeFranchisees),change:"Aktif",description:"Faaliyetteki bayiler",icon:CheckCircle2,tone:"bg-emerald-50 text-emerald-700 ring-emerald-200"},
    { title: "Toplam Şube", value:number.format(totalBranches),change:"Canlı",description:"Bayi ağına bağlı şubeler",icon:Store,tone:"bg-sky-50 text-sky-700 ring-sky-200"},
    { title: "Aktif Şube", value:number.format(activeBranches),change:"Aktif",description:"Faaliyetteki şubeler",icon:CheckCircle2,tone:"bg-teal-50 text-teal-700 ring-teal-200"},
    { title: "Kurulumdaki Şubeler", value:number.format(setupBranches),change:"Kurulum",description:"Açılışa hazırlanan şubeler",icon:Settings,tone:"bg-amber-50 text-amber-700 ring-amber-200"},
    { title: "Yaklaşan Açılışlar", value:number.format(upcomingOpenings),change:"30 gün",description:"Önümüzdeki 30 gün",icon:CalendarClock,tone:"bg-rose-50 text-rose-700 ring-rose-200"},
    { title:"Devam Eden Açılışlar",value:number.format(ongoingOpeningProjects),change:"Canlı",description:"Aktif açılış projeleri",icon:CalendarRange,tone:"bg-violet-50 text-violet-700 ring-violet-200"},
    { title:"Geciken Açılışlar",value:number.format(delayedOpeningProjects),change:"Gecikme",description:"Planlanan tarihi geçen projeler",icon:CalendarClock,tone:"bg-rose-50 text-rose-700 ring-rose-200"},
    { title:"Bugünkü Açılış Görevleri",value:number.format(todayOpeningTasks),change:"Bugün",description:"Bugün tamamlanması gerekenler",icon:CheckSquare,tone:"bg-amber-50 text-amber-700 ring-amber-200"},
    { title:"Onay Bekleyen Siparişler",value:number.format(pendingOrders),change:"Sipariş",description:"Merkez onayı bekleyen kayıtlar",icon:CheckSquare,tone:"bg-amber-50 text-amber-700 ring-amber-200"},
    { title:"Hazırlanacak Siparişler",value:number.format(warehouseOrders),change:"Depo",description:"Depo operasyon kuyruğu",icon:Store,tone:"bg-sky-50 text-sky-700 ring-sky-200"},
    { title:"Kritik Stoklar",value:number.format(lowStocks),change:"Uyarı",description:"Kullanılabilir miktarı düşük stoklar",icon:Bell,tone:"bg-rose-50 text-rose-700 ring-rose-200"},
    { title:"Bugün Sevk Edilen",value:number.format(shippedToday),change:"Bugün",description:"Bugün çıkışı yapılan sevkiyatlar",icon:CheckCircle2,tone:"bg-emerald-50 text-emerald-700 ring-emerald-200"},
  ];
  const followUps = followUpRecords.map((candidate) => ({ name: candidate.fullName, city: `${candidate.city} / ${candidate.district ?? "—"}`, status: candidate.nextFollowUpAt ? `Bugün ${time.format(candidate.nextFollowUpAt)}` : "Bugün", score: candidate.temperature }));
  return (
    <main className="min-h-screen bg-[#f6f7f4] text-[#1b1f1c]">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-[#dfe4dc] bg-[#17201b] px-4 py-5 text-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#a8ff60] text-[#17201b]">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a8ff60]">
                Iceberry
              </p>
              <h1 className="text-xl font-semibold">OS Panel</h1>
            </div>
          </div>

          <nav className="mt-8 space-y-1">
            {visibleNavigation.map((item) => (
              <Link
                href={item.href}
                key={item.label}
                className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                  item.active
                    ? "bg-white text-[#17201b] shadow-sm"
                    : "text-white/72 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-lg border border-white/12 bg-white/8 p-4">
            <Badge className="bg-[#a8ff60] text-[#17201b] hover:bg-[#a8ff60]">
              Franchise CRM
            </Badge>
            <p className="mt-3 text-sm leading-6 text-white/74">
              Aday yönetimi, takip akışı ve şube açılış operasyonları tek
              merkezde.
            </p>
            <Button className="mt-4 h-10 w-full bg-white text-[#17201b] hover:bg-white/90">
              Yeni aday ekle
              <ArrowUpRight className="size-4" />
            </Button>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-[#dfe4dc] bg-[#f6f7f4]/92 px-4 py-4 backdrop-blur md:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <MobileNavigation items={mobileNavigation} activeHref="/dashboard" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#65705f]">
                    Franchise operasyon merkezi
                  </p>
                  <h2 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">
                    Dashboard
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden h-10 items-center gap-2 rounded-lg border border-[#d3d9cf] bg-white px-3 text-sm text-[#65705f] md:flex">
                  <Search className="size-4" />
                  Aday, şehir veya lead ara
                </div>
                <Button size="icon" variant="outline" className="size-10 bg-white">
                  <Bell className="size-4" />
                </Button>
                {user?<div className="hidden text-right sm:block"><p className="text-sm font-semibold">{user.name}</p><p className="text-xs text-[#65705f]">{ROLE_LABELS[user.role as UserRole]}</p></div>:null}
                {user?<form action={logout}><Button variant="outline">Çıkış</Button></form>:null}
                <Avatar className="size-10">
                  <AvatarFallback className="bg-[#17201b] text-white">
                    IB
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          <div className="space-y-6 p-4 md:p-8">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {metrics.map((metric) => (
                <Card
                  key={metric.title}
                  className="rounded-lg border-[#dfe4dc] bg-white shadow-none"
                >
                  <CardHeader className="gap-3 pb-2">
                    <div
                      className={`flex size-10 items-center justify-center rounded-lg ring-1 ${metric.tone}`}
                    >
                      <metric.icon className="size-5" />
                    </div>
                    <CardTitle className="text-sm font-medium text-[#65705f]">
                      {metric.title}
                    </CardTitle>
                    <CardAction>
                      <Badge
                        variant="secondary"
                        className="bg-[#eef2ea] text-[#364036]"
                      >
                        {metric.change}
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold tracking-tight">
                      {metric.value}
                    </div>
                    <p className="mt-1 text-sm text-[#65705f]">
                      {metric.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
              <Card className="rounded-lg border-[#dfe4dc] bg-white shadow-none">
                <CardHeader>
                  <div>
                    <CardTitle>Lead dönüşüm akışı</CardTitle>
                    <CardDescription>
                      Adayların satış sürecindeki güncel dağılımı
                    </CardDescription>
                  </div>
                  <CardAction>
                    <Button variant="outline" className="h-9 bg-white">
                      Detaylar
                      <ChevronRight className="size-4" />
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-5">
                  {pipeline.map((item) => (
                    <div key={item.stage} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.stage}</span>
                        <span className="text-[#65705f]">{item.count} aday</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#eef2ea]">
                        <div
                          className={`h-2 rounded-full ${item.color}`}
                          style={{ width: `${Math.max(item.count / 3.7, 12)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-lg border-[#dfe4dc] bg-white shadow-none">
                <CardHeader>
                  <CardTitle>Bugünün Takipleri</CardTitle>
                  <CardDescription>Bugün iletişime geçilecek en fazla 5 aday</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {followUps.map((lead, index) => (
                    <div key={lead.name}>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10">
                          <AvatarFallback className="bg-[#eef2ea] text-[#17201b]">
                            {lead.name
                              .split(" ")
                              .map((part) => part[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {lead.name}
                          </p>
                          <p className="truncate text-sm text-[#65705f]">
                            {lead.city}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            {lead.score}
                          </div>
                          <div className="text-xs text-[#65705f]">sıcaklık</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between rounded-lg bg-[#f6f7f4] px-3 py-2 text-sm">
                        <span className="text-[#65705f]">{lead.status}</span>
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      </div>
                      {index < followUps.length - 1 ? (
                        <Separator className="mt-4 bg-[#edf0e9]" />
                      ) : null}
                    </div>
                  ))}
                  {followUps.length === 0 ? <p className="py-8 text-center text-sm text-[#65705f]">Bugün için planlanmış takip yok.</p> : null}
                </CardContent>
              </Card>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function mobileIconFor(href: string): MobileNavigationItem["icon"] {
  if (href === "/" || href.startsWith("/dashboard")) return "LayoutDashboard";
  if (href.startsWith("/leads")) return "MessageSquareText";
  if (href.startsWith("/candidates")) return "UsersRound";
  if (href.startsWith("/pipeline")) return "Columns3";
  if (href.startsWith("/tasks")) return "CheckSquare";
  if (href.startsWith("/documents")) return "FolderOpen";
  if (href.startsWith("/franchisees")) return "Building2";
  if (href.startsWith("/branches")) return "Store";
  if (href.startsWith("/openings")) return "CalendarRange";
  if (href.startsWith("/orders")) return "ShoppingCart";
  if (href.startsWith("/warehouse")) return "Warehouse";
  if (href.startsWith("/settings")) return "Settings";

  return "LineChart";
}
