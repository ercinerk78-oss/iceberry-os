import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

type Permission =
  | "dashboard"
  | "leads"
  | "appointments"
  | "candidates"
  | "pipeline"
  | "tasks"
  | "documents"
  | "franchisees"
  | "branches"
  | "branch_revenue"
  | "openings"
  | "orders"
  | "order_admin"
  | "warehouse"
  | "reports"
  | "settings"
  | "users"
  | "integrations"
  | "invoice"
  | "finance"
  | "operations"
  | "locations.view"
  | "locations.create"
  | "locations.update"
  | "locations.delete"
  | "locations.archive"
  | "locations.upload_document"
  | "locations.link_lead"
  | "locations.view_financials"
  | "stock_manage"
  | "shipment_manage"
  | "branch_portal";

const publicWebhookPrefixes = [
  "/api/webhooks/meta",
  "/api/webhooks/whatsapp",
  "/api/webhooks/ticimax",
  "/api/webhooks/parasut",
];

const allPermissions: Permission[] = [
  "dashboard",
  "leads",
  "appointments",
  "candidates",
  "pipeline",
  "tasks",
  "documents",
  "branches",
  "branch_revenue",
  "openings",
  "orders",
  "order_admin",
  "warehouse",
  "reports",
  "settings",
  "users",
  "integrations",
  "invoice",
  "finance",
  "operations",
  "locations.view",
  "locations.create",
  "locations.update",
  "locations.delete",
  "locations.archive",
  "locations.upload_document",
  "locations.link_lead",
  "locations.view_financials",
  "stock_manage",
  "shipment_manage",
  "branch_portal",
];

const rolePermissions: Record<string, readonly Permission[]> = {
  GENERAL_MANAGER: allPermissions.filter((permission) => permission !== "franchisees"),
  OPERATIONS_MANAGER: allPermissions.filter((permission) => !["settings", "users", "franchisees", "locations.delete", "locations.archive", "locations.view_financials"].includes(permission)),
  FRANCHISE_MANAGER: ["dashboard", "branch_portal", "tasks", "documents", "branches", "branch_revenue", "openings", "operations"],
  WAREHOUSE_MANAGER: ["warehouse", "stock_manage", "shipment_manage"],
  MUHASEBE: ["dashboard", "orders", "order_admin", "invoice", "integrations", "reports", "finance"],
  APPOINTMENT_DEPARTMENT: ["dashboard", "leads", "appointments", "tasks", "locations.view", "locations.link_lead"],
  RANDEVU_DEPARTMANI: ["dashboard", "leads", "appointments", "tasks", "locations.view", "locations.link_lead"],
  BRANCH_OWNER: ["branch_portal", "branches", "branch_revenue", "tasks", "documents", "finance", "operations"],
  BRANCH_MANAGER: ["branch_portal", "branches", "branch_revenue", "tasks", "documents", "finance", "operations"],
  BRANCH_STAFF: ["branch_portal", "tasks", "documents"],
};

function hasRoutePermission(role: string, permission: Permission) {
  return rolePermissions[role]?.includes(permission) ?? false;
}

function routePermission(path: string): Permission | null {
  if (path === "/" || path.startsWith("/dashboard")) return "dashboard";
  if (path.startsWith("/api/documents")) return "documents";
  if (path.startsWith("/settings/users")) return "users";
  if (path.startsWith("/integrations")) return "integrations";
  if (path.startsWith("/finance")) return "finance";
  if (path.startsWith("/operations")) return "operations";
  if (path.startsWith("/locations")) return "locations.view";
  if (path.startsWith("/settings")) return "settings";
  if (path.startsWith("/leads")) return "leads";
  if (path.startsWith("/branch-portal")) return "branch_portal";
  if (path.startsWith("/appointments")) return "appointments";
  if (path.startsWith("/candidates")) return "candidates";
  if (path.startsWith("/pipeline")) return "pipeline";
  if (path.startsWith("/tasks")) return "tasks";
  if (path.startsWith("/documents")) return "documents";
  if (path.startsWith("/franchisees")) return "franchisees";
  if (path.startsWith("/branches")) return "branches";
  if (path.startsWith("/branch-revenues")) return "branch_revenue";
  if (path.startsWith("/openings")) return "openings";
  if (path.startsWith("/orders/admin")) return "order_admin";
  if (path.startsWith("/orders")) return "orders";
  if (path.startsWith("/warehouse")) return "warehouse";
  if (path.startsWith("/reports")) return "reports";

  return null;
}

function homeForRole(role: string) {
  if (role === "WAREHOUSE_MANAGER") return "/warehouse/orders";
  if (role === "APPOINTMENT_DEPARTMENT" || role === "RANDEVU_DEPARTMANI") return "/leads";
  if (["BRANCH_OWNER", "BRANCH_MANAGER", "BRANCH_STAFF", "FRANCHISE_MANAGER"].includes(role)) return "/branch-portal";

  return "/";
}

function loginRedirect(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const next = `${path}${request.nextUrl.search}`;

  return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, request.url));
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/_next") || path === "/favicon.ico" || publicWebhookPrefixes.some((prefix) => path.startsWith(prefix))) {
    return NextResponse.next();
  }

  let session = null;
  try {
    session = await verifySessionToken(
      request.cookies.get(SESSION_COOKIE)?.value,
      process.env.AUTH_SECRET || "iceberry-development-secret-change-me",
    );
  } catch (error) {
    console.error("[proxy] Session validation failed", error);
    return path === "/login" ? NextResponse.next() : loginRedirect(request);
  }

  if (path === "/login") {
    if (session) return NextResponse.redirect(new URL(homeForRole(session.role), request.url));
    return NextResponse.next();
  }

  if (!session) return loginRedirect(request);

  const permission = routePermission(path);
  if (permission && !hasRoutePermission(session.role, permission)) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
