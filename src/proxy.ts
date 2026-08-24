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
  | "documents.manage"
  | "franchisees"
  | "branches"
  | "branch_revenue"
  | "openings"
  | "orders"
  | "order_admin"
  | "procurement"
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
  | "academy.view"
  | "academy.manage"
  | "academy.assign"
  | "academy.reports"
  | "academy.certificates"
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
  "documents.manage",
  "branches",
  "branch_revenue",
  "openings",
  "orders",
  "order_admin",
  "procurement",
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
  "academy.view",
  "academy.manage",
  "academy.assign",
  "academy.reports",
  "academy.certificates",
  "stock_manage",
  "shipment_manage",
  "branch_portal",
];

const rolePermissions: Record<string, readonly Permission[]> = {
  GENERAL_MANAGER: allPermissions.filter((permission) => permission !== "franchisees"),
  OPERATIONS_MANAGER: allPermissions.filter((permission) => !["settings", "users", "franchisees", "locations.delete", "locations.archive", "locations.view_financials"].includes(permission)),
  FRANCHISE_MANAGER: ["dashboard", "branch_portal", "tasks", "documents", "branches", "branch_revenue", "openings", "operations", "locations.view", "locations.link_lead", "academy.view", "academy.assign", "academy.reports"],
  WAREHOUSE_MANAGER: ["warehouse", "stock_manage", "shipment_manage", "procurement", "openings", "tasks", "academy.view"],
  MUHASEBE: ["dashboard", "orders", "order_admin", "procurement", "invoice", "integrations", "reports", "finance", "openings", "documents"],
  APPOINTMENT_DEPARTMENT: ["dashboard", "leads", "appointments", "candidates", "tasks", "locations.view", "locations.link_lead", "academy.view"],
  ARCHITECTURE_PROJECT_IMPLEMENTATION: ["dashboard", "openings", "tasks", "documents", "locations.view", "locations.create", "locations.update", "locations.upload_document", "academy.view"],
  ADVERTISING_OPERATIONS: ["dashboard", "leads", "appointments", "candidates", "pipeline", "reports", "integrations", "academy.view"],
  OPENING_COORDINATOR: ["dashboard", "openings", "tasks", "documents", "orders", "warehouse", "locations.view", "locations.create", "locations.update", "locations.upload_document", "locations.link_lead", "academy.view", "academy.assign", "academy.reports"],
  AUDITOR: ["dashboard", "operations", "openings", "tasks", "documents", "locations.view", "academy.view"],
  TRAINING_DEPARTMENT: ["dashboard", "academy.view", "academy.manage", "academy.assign", "academy.reports", "academy.certificates", "documents"],
  DOCUMENT_MANAGER: ["dashboard", "documents", "documents.manage", "academy.view", "academy.reports"],
  BRANCH_OWNER: ["operations", "academy.view"],
  BRANCH_MANAGER: ["operations", "academy.view"],
};

const branchRoles = new Set(["BRANCH_OWNER", "BRANCH_MANAGER"]);
const branchRoleAllowedPermissions = new Set<Permission>(["operations", "academy.view"]);

function hasRoutePermission(role: string, permission: Permission, permissions?: Permission[]) {
  if (branchRoles.has(role) && !branchRoleAllowedPermissions.has(permission)) return false;
  if (permissions?.length) return permissions.includes(permission);
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
  if (path.startsWith("/academy")) return "academy.view";
  if (path.startsWith("/franchisees")) return "franchisees";
  if (path.startsWith("/branches")) return "branches";
  if (path.startsWith("/branch-map")) return "branches";
  if (path.startsWith("/branch-revenues")) return "branch_revenue";
  if (path.startsWith("/openings")) return "openings";
  if (path.startsWith("/procurement")) return "procurement";
  if (path.startsWith("/orders/admin")) return "order_admin";
  if (path.startsWith("/orders")) return "orders";
  if (path.startsWith("/warehouse")) return "warehouse";
  if (path.startsWith("/reports")) return "reports";

  return null;
}

function homeForRole(role: string) {
  if (role === "WAREHOUSE_MANAGER") return "/warehouse/orders";
  if (role === "APPOINTMENT_DEPARTMENT") return "/candidates";
  if (["BRANCH_OWNER", "BRANCH_MANAGER"].includes(role)) return "/operations";
  if (role === "FRANCHISE_MANAGER") return "/branch-portal";

  return "/";
}

function loginRedirect(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const next = `${path}${request.nextUrl.search}`;

  return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, request.url));
}

function legacyLeadRedirect(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path !== "/leads" && !path.startsWith("/leads/")) return null;

  const url = request.nextUrl.clone();
  const leadId = path === "/leads" ? "" : path.replace(/^\/leads\//, "").split("/")[0];
  url.pathname = "/candidates";
  if (leadId) url.searchParams.set("leadId", leadId);

  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/_next") || path === "/favicon.ico" || publicWebhookPrefixes.some((prefix) => path.startsWith(prefix))) {
    return NextResponse.next();
  }

  const leadRedirect = legacyLeadRedirect(request);
  if (leadRedirect) return leadRedirect;

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
  if (permission && !hasRoutePermission(session.role, permission, session.permissions)) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
