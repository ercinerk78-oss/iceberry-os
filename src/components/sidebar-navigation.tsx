"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { useState } from "react";
import {
  Bell,
  Building2,
  CalendarCheck2,
  CalendarRange,
  CheckSquare,
  ChevronDown,
  Columns3,
  FolderOpen,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  LineChart,
  MapPinned,
  MessageSquareText,
  Package,
  PlugZap,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  UsersRound,
  Warehouse,
} from "lucide-react";

import {
  activeNavigationGroupId,
  isNavigationItemActive,
  type NavigationIconKey,
  type NavigationItem,
  type VisibleNavigationGroup,
} from "@/lib/navigation";

const icons: Record<NavigationIconKey, ComponentType<{ className?: string }>> = {
  Bell,
  Building2,
  CalendarCheck2,
  CalendarRange,
  CheckSquare,
  Columns3,
  FolderOpen,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  LineChart,
  MapPinned,
  MessageSquareText,
  Package,
  PlugZap,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  UsersRound,
  Warehouse,
};

export type SidebarNavigationItem = NavigationItem & { label: string };
export type SidebarNavigationGroup = Omit<VisibleNavigationGroup, "children"> & {
  label: string;
  children: SidebarNavigationItem[];
};

export function SidebarNavigation({
  dashboard,
  groups,
  activeHref,
}: {
  dashboard: SidebarNavigationItem | null;
  groups: SidebarNavigationGroup[];
  activeHref: string;
}) {
  const pathname = usePathname();
  const activeGroup = activeNavigationGroupId(groups, activeHref, pathname);
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroup);

  return (
    <nav className="mt-8 space-y-2 overflow-y-auto pr-1">
      {dashboard ? <LeafLink item={dashboard} activeHref={activeHref} pathname={pathname} level="top" /> : null}
      <div className="space-y-1 pt-1">
        {groups.map((group) => {
          const Icon = icons[group.icon];
          const expanded = openGroup === group.id;
          const groupHasActive = activeGroup === group.id;
          const panelId = `sidebar-group-${group.id}`;

          return (
            <div key={group.id} className="rounded-lg">
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a8ff60] ${
                  groupHasActive || expanded
                    ? "bg-white/12 text-white"
                    : "text-white/72 hover:bg-white/10 hover:text-white"
                }`}
                onClick={() => setOpenGroup((current) => (current === group.id ? null : group.id))}
              >
                <Icon className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 text-left">{group.label}</span>
                <ChevronDown className={`size-4 shrink-0 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`} />
              </button>

              <div
                id={panelId}
                className={`grid transition-[grid-template-rows,opacity] duration-150 ease-out ${
                  expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="ml-4 mt-1 space-y-1 border-l border-white/12 pl-2">
                    {group.children.map((item) => (
                      <LeafLink key={item.href} item={item} activeHref={activeHref} pathname={pathname} level="child" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function LeafLink({
  item,
  activeHref,
  pathname,
  level,
}: {
  item: SidebarNavigationItem;
  activeHref: string;
  pathname: string;
  level: "top" | "child";
}) {
  const Icon = icons[item.icon];
  const active = isNavigationItemActive(item.href, activeHref, pathname);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a8ff60] ${
        active
          ? "bg-white text-[#17201b] shadow-sm"
          : level === "top"
            ? "text-white/72 hover:bg-white/10 hover:text-white"
            : "text-white/68 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 truncate">{item.label}</span>
    </Link>
  );
}
