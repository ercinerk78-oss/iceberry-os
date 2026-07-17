import { translate, type Locale } from "@/lib/i18n/messages";

export const USER_ROLES = [
  "GENERAL_MANAGER",
  "OPERATIONS_MANAGER",
  "FRANCHISE_MANAGER",
  "WAREHOUSE_MANAGER",
  "MUHASEBE",
  "APPOINTMENT_DEPARTMENT",
  "RANDEVU_DEPARTMANI",
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
  "stock_manage",
  "shipment_manage",
  "branch_portal",
];

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  GENERAL_MANAGER: all.filter((permission) => permission !== "franchisees"),
  OPERATIONS_MANAGER: all.filter((permission) => !["settings", "users", "franchisees"].includes(permission)),
  FRANCHISE_MANAGER: ["dashboard", "branch_portal", "tasks", "documents", "branches", "branch_revenue", "openings", "operations"],
  WAREHOUSE_MANAGER: ["warehouse", "stock_manage", "shipment_manage"],
  MUHASEBE: ["dashboard", "orders", "order_admin", "invoice", "integrations", "reports", "finance"],
  APPOINTMENT_DEPARTMENT: ["dashboard", "leads", "appointments", "tasks"],
  RANDEVU_DEPARTMANI: ["dashboard", "leads", "appointments", "tasks"],
  BRANCH_OWNER: ["branch_portal", "branches", "branch_revenue", "tasks", "documents", "finance", "operations"],
  BRANCH_MANAGER: ["branch_portal", "branches", "branch_revenue", "tasks", "documents", "finance", "operations"],
  BRANCH_STAFF: ["branch_portal", "tasks", "documents"],
};

export function hasPermission(role: string, permission: Permission) {
  return (
    USER_ROLES.includes(role as UserRole) &&
    ROLE_PERMISSIONS[role as UserRole].includes(permission)
  );
}

export function routePermission(path: string): Permission | null {
  if (path === "/" || path.startsWith("/dashboard")) return "dashboard";
  if (path.startsWith("/api/documents")) return "documents";
  if (path.startsWith("/settings/users")) return "users";
  if (path.startsWith("/integrations")) return "integrations";
  if (path.startsWith("/finance")) return "finance";
  if (path.startsWith("/operations")) return "operations";
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

export function homeForRole(role: string) {
  if (role === "WAREHOUSE_MANAGER") return "/warehouse/orders";
  if (role === "APPOINTMENT_DEPARTMENT" || role === "RANDEVU_DEPARTMANI") return "/leads";
  if (["BRANCH_OWNER", "BRANCH_MANAGER", "BRANCH_STAFF", "FRANCHISE_MANAGER"].includes(role)) return "/branch-portal";

  return "/";
}
