import { translate, type Locale } from "@/lib/i18n/messages";

export const USER_ROLES = [
  "GENERAL_MANAGER",
  "OPERATIONS_MANAGER",
  "FRANCHISE_MANAGER",
  "WAREHOUSE_MANAGER",
  "MUHASEBE",
  "APPOINTMENT_DEPARTMENT",
  "RANDEVU_DEPARTMANI",
  "ARCHITECTURAL_LEAD",
  "OPENING_COORDINATOR",
  "AUDITOR",
  "TRAINING_MANAGER",
  "DOCUMENT_MANAGER",
  "BRANCH_OWNER",
  "BRANCH_MANAGER",
  "BRANCH_STAFF",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  GENERAL_MANAGER: "Genel Müdür",
  OPERATIONS_MANAGER: "Operasyon Müdürü",
  FRANCHISE_MANAGER: "Şube Operasyon Yöneticisi",
  WAREHOUSE_MANAGER: "Depo Sorumlusu",
  MUHASEBE: "Muhasebe",
  APPOINTMENT_DEPARTMENT: "Randevu Departmanı",
  RANDEVU_DEPARTMANI: "Randevu Departmanı",
  ARCHITECTURAL_LEAD: "Mimari Sorumlu",
  OPENING_COORDINATOR: "Açılış Koordinatörü",
  AUDITOR: "Denetçi",
  TRAINING_MANAGER: "Eğitim Yöneticisi",
  DOCUMENT_MANAGER: "Doküman Yöneticisi",
  BRANCH_OWNER: "Şube Sahibi",
  BRANCH_MANAGER: "Şube Müdürü",
  BRANCH_STAFF: "Şube Personeli",
};

export function roleLabel(role: string, locale?: Locale) {
  return translate(locale, `roles.${role}`, ROLE_LABELS[role as UserRole] ?? role);
}

export type Permission =
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

const all: Permission[] = [
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

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  GENERAL_MANAGER: all.filter((permission) => permission !== "franchisees"),
  OPERATIONS_MANAGER: all.filter((permission) => !["settings", "users", "franchisees", "locations.delete", "locations.archive", "locations.view_financials"].includes(permission)),
  FRANCHISE_MANAGER: ["dashboard", "branch_portal", "tasks", "documents", "branches", "branch_revenue", "openings", "operations", "locations.view", "locations.link_lead", "academy.view", "academy.assign", "academy.reports"],
  WAREHOUSE_MANAGER: ["warehouse", "stock_manage", "shipment_manage", "openings", "tasks", "academy.view"],
  MUHASEBE: ["dashboard", "orders", "order_admin", "invoice", "integrations", "reports", "finance", "openings", "documents"],
  APPOINTMENT_DEPARTMENT: ["dashboard", "leads", "appointments", "tasks", "locations.view", "locations.link_lead", "academy.view"],
  RANDEVU_DEPARTMANI: ["dashboard", "leads", "appointments", "tasks", "locations.view", "locations.link_lead", "academy.view"],
  ARCHITECTURAL_LEAD: ["dashboard", "openings", "tasks", "documents", "locations.view", "locations.create", "locations.update", "locations.upload_document", "academy.view"],
  OPENING_COORDINATOR: ["dashboard", "openings", "tasks", "documents", "orders", "warehouse", "locations.view", "locations.create", "locations.update", "locations.upload_document", "locations.link_lead", "academy.view", "academy.assign", "academy.reports"],
  AUDITOR: ["dashboard", "operations", "openings", "tasks", "documents", "locations.view", "academy.view"],
  TRAINING_MANAGER: ["dashboard", "academy.view", "academy.manage", "academy.assign", "academy.reports", "academy.certificates", "documents"],
  DOCUMENT_MANAGER: ["dashboard", "documents", "documents.manage", "academy.view", "academy.reports"],
  BRANCH_OWNER: ["branch_portal", "branches", "branch_revenue", "tasks", "documents", "finance", "operations", "openings", "academy.view", "academy.assign", "academy.reports"],
  BRANCH_MANAGER: ["branch_portal", "branches", "branch_revenue", "tasks", "documents", "finance", "operations", "openings", "academy.view", "academy.reports"],
  BRANCH_STAFF: ["branch_portal", "tasks", "documents", "academy.view"],
};

export function hasPermission(role: string, permission: Permission) {
  return USER_ROLES.includes(role as UserRole) && ROLE_PERMISSIONS[role as UserRole].includes(permission);
}

export function routePermission(path: string): Permission | null {
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
  if (path.startsWith("/orders/admin")) return "order_admin";
  if (path.startsWith("/orders")) return "orders";
  if (path.startsWith("/warehouse")) return "warehouse";
  if (path.startsWith("/reports")) return "reports";

  return null;
}

export function homeForRole(role: string) {
  if (role === "WAREHOUSE_MANAGER") return "/warehouse/orders";
  if (role === "APPOINTMENT_DEPARTMENT" || role === "RANDEVU_DEPARTMANI") return "/leads";
  if (["BRANCH_OWNER", "BRANCH_MANAGER", "BRANCH_STAFF", "FRANCHISE_MANAGER"].includes(role)) return "/branch-portal";

  return "/";
}
