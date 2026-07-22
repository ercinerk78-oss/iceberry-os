"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  Menu,
  MessageSquareText,
  Package,
  PlugZap,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  UsersRound,
  Warehouse,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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

export type MobileNavigationItem = NavigationItem & { label: string };
export type MobileNavigationGroup = Omit<VisibleNavigationGroup, "children"> & {
  label: string;
  children: MobileNavigationItem[];
};

type MobileNavigationProps = {
  dashboard: MobileNavigationItem | null;
  groups: MobileNavigationGroup[];
  activeHref: string;
};

export function MobileNavigation({ dashboard, groups, activeHref }: MobileNavigationProps) {
  const activeGroup = activeNavigationGroupId(groups, activeHref);
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroup);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  const drawer = open ? (
    <>
      <button
        type="button"
        aria-label="Mobil menüyü kapat"
        className="fixed inset-0 z-[90] bg-[#17201b]/55 lg:hidden"
        onClick={() => setOpen(false)}
      />
      <aside
        id="mobile-navigation-drawer"
        className="fixed left-0 top-0 z-[100] flex h-[100dvh] w-[min(88vw,22rem)] flex-col overflow-y-auto bg-[#17201b] px-4 py-5 text-white shadow-2xl lg:hidden"
      >
        <div className="flex items-center justify-between gap-3">
          <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#a8ff60] text-[#17201b]">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a8ff60]">Iceberry</p>
              <h2 className="text-lg font-semibold">OS Panel</h2>
            </div>
          </Link>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Mobil menüyü kapat"
            className="size-9 text-white hover:bg-white/10 hover:text-white"
            onClick={() => setOpen(false)}
          >
            <X className="size-5" />
          </Button>
        </div>

        <nav className="mt-6 min-h-0 flex-1 space-y-2 pb-4">
          {dashboard ? <DrawerLink item={dashboard} activeHref={activeHref} onClose={() => setOpen(false)} level="top" /> : null}

          {groups.map((group) => {
            const Icon = icons[group.icon];
            const expanded = openGroup === group.id;
            const groupHasActive = activeGroup === group.id;
            const panelId = `mobile-group-${group.id}`;

            return (
              <div key={group.id}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a8ff60] ${
                    expanded || groupHasActive
                      ? "bg-white/12 text-white"
                      : "text-white/76 hover:bg-white/10 hover:text-white"
                  }`}
                  onClick={() => setOpenGroup((current) => (current === group.id ? null : group.id))}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 text-left">{group.label}</span>
                  <ChevronDown className={`size-4 shrink-0 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`} />
                </button>
                <div
                  id={panelId}
                  className={`grid transition-[grid-template-rows,opacity] duration-150 ${
                    expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="ml-4 mt-1 space-y-1 border-l border-white/12 pl-2">
                      {group.children.map((item) => (
                        <DrawerLink key={item.href} item={item} activeHref={activeHref} onClose={() => setOpen(false)} level="child" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  ) : null;

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label="Mobil menüyü aç"
        aria-expanded={open}
        aria-controls="mobile-navigation-drawer"
        className="relative z-30 size-10 border-[#d3d9cf] bg-white lg:hidden"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-4" />
      </Button>

      {drawer && typeof document !== "undefined" ? createPortal(drawer, document.body) : null}
    </>
  );
}

function DrawerLink({
  item,
  activeHref,
  onClose,
  level,
}: {
  item: MobileNavigationItem;
  activeHref: string;
  onClose: () => void;
  level: "top" | "child";
}) {
  const Icon = icons[item.icon];
  const active = isNavigationItemActive(item.href, activeHref);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onClose}
      className={`relative z-[101] flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a8ff60] ${
        active
          ? "bg-white text-[#17201b] shadow-sm"
          : level === "top"
            ? "text-white/76 hover:bg-white/10 hover:text-white"
            : "text-white/68 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 truncate">{item.label}</span>
    </Link>
  );
}
