import { hasPermission, routePermission, type Permission } from "@/lib/permissions";

export type NavigationIconKey =
  | "Bell"
  | "Building2"
  | "CalendarCheck2"
  | "CalendarRange"
  | "CheckSquare"
  | "Columns3"
  | "FolderOpen"
  | "GraduationCap"
  | "Landmark"
  | "LayoutDashboard"
  | "LineChart"
  | "MapPinned"
  | "MessageSquareText"
  | "Package"
  | "PlugZap"
  | "Settings"
  | "ShoppingCart"
  | "ShieldCheck"
  | "Store"
  | "Truck"
  | "UsersRound"
  | "Warehouse";

export type NavigationItem = {
  id: string;
  key: string;
  href: string;
  icon: NavigationIconKey;
  permission: Permission;
};

export type NavigationGroup = {
  id: string;
  key: string;
  icon: NavigationIconKey;
  children: NavigationItem[];
};

export type VisibleNavigationGroup = NavigationGroup & {
  children: NavigationItem[];
};

function item(id: string, key: string, href: string, icon: NavigationIconKey): NavigationItem {
  const permission = routePermission(href);
  if (!permission) throw new Error(`Navigation permission missing for ${href}`);
  return { id, key, href, icon, permission };
}

export const dashboardNavigation = item("dashboard", "navigation.dashboard", "/dashboard", "LayoutDashboard");

export const navigationGroups: NavigationGroup[] = [
  {
    id: "franchise",
    key: "navigationGroups.franchise",
    icon: "Building2",
    children: [
      item("leads", "navigation.leads", "/leads", "MessageSquareText"),
      item("appointments", "navigation.appointments", "/appointments", "CalendarCheck2"),
      item("candidates", "navigation.candidates", "/candidates", "UsersRound"),
      item("locations", "navigation.locations", "/locations", "MapPinned"),
      item("pipeline", "navigation.pipeline", "/pipeline", "Columns3"),
      item("tasks", "navigation.tasks", "/tasks", "CheckSquare"),
    ],
  },
  {
    id: "branch",
    key: "navigationGroups.branch",
    icon: "Store",
    children: [
      item("branches", "navigation.branches", "/branches", "Store"),
      item("branchPortal", "navigation.branchPortal", "/branch-portal", "CheckSquare"),
      item("branchRevenues", "navigation.branchRevenues", "/branch-revenues", "LineChart"),
      item("operations", "navigation.operations", "/operations", "ShieldCheck"),
      item("branchMap", "navigation.branchMap", "/branch-map", "MapPinned"),
    ],
  },
  {
    id: "opening",
    key: "navigationGroups.opening",
    icon: "CalendarRange",
    children: [item("openings", "navigation.openings", "/openings", "CalendarRange")],
  },
  {
    id: "warehouseLogistics",
    key: "navigationGroups.warehouseLogistics",
    icon: "Warehouse",
    children: [
      item("orders", "navigation.orders", "/orders", "ShoppingCart"),
      item("orderAdmin", "navigation.orderAdmin", "/orders/admin", "Package"),
      item("warehouseOrders", "navigation.warehouseOrders", "/warehouse/orders", "Package"),
      item("shipments", "navigation.shipments", "/warehouse/shipments", "Truck"),
      item("warehouse", "navigation.warehouse", "/warehouse", "Warehouse"),
      item("stock", "navigation.stock", "/warehouse/stock", "Warehouse"),
      item("goodsReceipts", "navigation.goodsReceipts", "/warehouse/goods-receipts", "CheckSquare"),
      item("lots", "navigation.lots", "/warehouse/lots", "CalendarRange"),
      item("counts", "navigation.counts", "/warehouse/counts", "CheckSquare"),
      item("productMappings", "navigation.productMappings", "/warehouse/product-mappings", "Package"),
      item("compliance", "navigation.compliance", "/warehouse/compliance", "Bell"),
      item("movements", "navigation.movements", "/warehouse/movements", "LineChart"),
    ],
  },
  {
    id: "finance",
    key: "navigationGroups.finance",
    icon: "Landmark",
    children: [
      item("finance", "navigation.finance", "/finance", "Landmark"),
      item("integrations", "navigation.integrations", "/integrations", "PlugZap"),
    ],
  },
  {
    id: "academy",
    key: "navigationGroups.academy",
    icon: "GraduationCap",
    children: [item("academy", "navigation.academy", "/academy", "GraduationCap")],
  },
  {
    id: "documents",
    key: "navigationGroups.documents",
    icon: "FolderOpen",
    children: [item("documents", "navigation.documents", "/documents", "FolderOpen")],
  },
  {
    id: "reports",
    key: "navigationGroups.reports",
    icon: "LineChart",
    children: [item("reports", "navigation.reports", "/reports", "LineChart")],
  },
  {
    id: "system",
    key: "navigationGroups.system",
    icon: "Settings",
    children: [
      item("settings", "navigation.settings", "/settings", "Settings"),
      item("users", "navigation.users", "/settings/users", "UsersRound"),
    ],
  },
];

export function isNavigationItemActive(href: string, activeHref: string, pathname?: string | null) {
  const current = pathname || activeHref;
  const exactOnlyParents = new Set(["/orders", "/settings", "/warehouse"]);
  if (exactOnlyParents.has(href)) return current === href || activeHref === href;

  return current === href || activeHref === href || activeHref.startsWith(`${href}/`);
}

export function visibleNavigationForRole(role: string) {
  const dashboard = hasPermission(role, dashboardNavigation.permission) ? dashboardNavigation : null;
  const groups = navigationGroups
    .map((group) => ({
      ...group,
      children: group.children.filter((child) => hasPermission(role, child.permission)),
    }))
    .filter((group) => group.children.length > 0);

  return { dashboard, groups };
}

export function activeNavigationGroupId(groups: VisibleNavigationGroup[], activeHref: string, pathname?: string | null) {
  return groups.find((group) => group.children.some((child) => isNavigationItemActive(child.href, activeHref, pathname)))?.id ?? null;
}
