"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  CalendarRange,
  CheckSquare,
  Columns3,
  FolderOpen,
  LayoutDashboard,
  LineChart,
  MapPinned,
  Menu,
  MessageSquareText,
  Package,
  Settings,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  UsersRound,
  Warehouse,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const icons = {
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
  Settings,
  ShoppingCart,
  Store,
  Truck,
  UsersRound,
  Warehouse,
} as const;

export type MobileNavigationItem = {
  label: string;
  href: string;
  icon: keyof typeof icons;
};

type MobileNavigationProps = {
  items: MobileNavigationItem[];
  activeHref: string;
};

export function MobileNavigation({ items, activeHref }: MobileNavigationProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === activeHref || href === pathname || (href !== "/" && pathname.startsWith(href));

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

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Mobil menüyü kapat"
            className="absolute inset-0 z-0 bg-[#17201b]/45"
            onClick={() => setOpen(false)}
          />
          <aside
            id="mobile-navigation-drawer"
            className="absolute inset-y-0 left-0 z-10 flex w-[min(88vw,22rem)] flex-col bg-[#17201b] px-4 py-5 text-white shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3"
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#a8ff60] text-[#17201b]">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a8ff60]">
                    Iceberry
                  </p>
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

            <nav className="mt-6 min-h-0 flex-1 space-y-1 overflow-y-auto pb-4">
              {items.map((item) => {
                const Icon = icons[item.icon];
                const active = isActive(item.href);

                return (
                  <Link
                    href={item.href}
                    key={item.href}
                    onClick={() => setOpen(false)}
                    className={`relative z-20 flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                      active
                        ? "bg-white text-[#17201b] shadow-sm"
                        : "text-white/76 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
