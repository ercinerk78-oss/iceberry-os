export const USER_ROLES = [
  "GENERAL_MANAGER",
  "OPERATIONS_MANAGER",
  "FRANCHISE_MANAGER",
  "WAREHOUSE_MANAGER",
  "APPOINTMENT_DEPARTMENT",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  GENERAL_MANAGER: "Genel Müdür",
  OPERATIONS_MANAGER: "Operasyon Müdürü",
  FRANCHISE_MANAGER: "Bayi Yöneticisi",
  WAREHOUSE_MANAGER: "Depo Sorumlusu",
  APPOINTMENT_DEPARTMENT: "Randevu Departmanı",
};

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
  | "openings"
  | "orders"
  | "order_admin"
  | "warehouse"
  | "reports"
  | "settings"
  | "users"
  | "invoice"
  | "stock_manage"
  | "shipment_manage";

const all: Permission[] = [
  "dashboard",
  "leads",
  "appointments",
  "candidates",
  "pipeline",
  "tasks",
  "documents",
  "branches",
  "openings",
  "orders",
  "order_admin",
  "warehouse",
  "reports",
  "settings",
  "users",
  "invoice",
  "stock_manage",
  "shipment_manage",
];

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  GENERAL_MANAGER: all.filter((permission) => permission !== "franchisees"),
  OPERATIONS_MANAGER: all.filter((permission) => !["settings", "users", "franchisees"].includes(permission)),
  FRANCHISE_MANAGER: [
    "dashboard",
    "tasks",
    "documents",
    "branches",
    "openings",
    "orders",
    "order_admin",
    "warehouse",
  ],
  WAREHOUSE_MANAGER: ["warehouse", "stock_manage", "shipment_manage"],
  APPOINTMENT_DEPARTMENT: ["dashboard", "leads", "appointments", "tasks"],
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
  if (path.startsWith("/settings")) return "settings";
  if (path.startsWith("/leads")) return "leads";
  if (path.startsWith("/appointments")) return "appointments";
  if (path.startsWith("/candidates")) return "candidates";
  if (path.startsWith("/pipeline")) return "pipeline";
  if (path.startsWith("/tasks")) return "tasks";
  if (path.startsWith("/documents")) return "documents";
  if (path.startsWith("/franchisees")) return "franchisees";
  if (path.startsWith("/branches")) return "branches";
  if (path.startsWith("/openings")) return "openings";
  if (path.startsWith("/orders/admin")) return "order_admin";
  if (path.startsWith("/orders")) return "orders";
  if (path.startsWith("/warehouse")) return "warehouse";
  if (path.startsWith("/reports")) return "reports";

  return null;
}

export function homeForRole(role: string) {
  if (role === "WAREHOUSE_MANAGER") return "/warehouse/orders";
  if (role === "APPOINTMENT_DEPARTMENT") return "/leads";

  return "/";
}
