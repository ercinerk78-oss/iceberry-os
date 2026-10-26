import { translate, type Locale } from "@/lib/i18n/messages";

export const USER_ROLES = [
  "GENERAL_MANAGER",
  "OPERATIONS_MANAGER",
  "FRANCHISE_MANAGER",
  "WAREHOUSE_MANAGER",
  "MUHASEBE",
  "APPOINTMENT_DEPARTMENT",
  "ARCHITECTURE_PROJECT_IMPLEMENTATION",
  "ADVERTISING_OPERATIONS",
  "OPENING_COORDINATOR",
  "AUDITOR",
  "TRAINING_DEPARTMENT",
  "DOCUMENT_MANAGER",
  "BRANCH_OWNER",
  "BRANCH_MANAGER",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  GENERAL_MANAGER: "Genel Müdür",
  OPERATIONS_MANAGER: "Operasyon Müdürü",
  FRANCHISE_MANAGER: "Şube Operasyon Yöneticisi",
  WAREHOUSE_MANAGER: "Depo Sorumlusu",
  MUHASEBE: "Muhasebe",
  APPOINTMENT_DEPARTMENT: "Randevu Departmanı",
  ARCHITECTURE_PROJECT_IMPLEMENTATION: "Mimari Proje ve Uygulama Departmanı",
  ADVERTISING_OPERATIONS: "Reklam Uygulamaları Departmanı",
  OPENING_COORDINATOR: "Açılış Koordinatörü",
  AUDITOR: "Denetçi",
  TRAINING_DEPARTMENT: "Eğitim Departmanı",
  DOCUMENT_MANAGER: "Doküman Yöneticisi",
  BRANCH_OWNER: "Şube Sahibi",
  BRANCH_MANAGER: "Şube Müdürü",
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

export type PermissionDefinition = {
  key: Permission;
  label: string;
  description: string;
  group: string;
};

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

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  { key: "dashboard", label: "Kontrol Paneli", description: "Genel performans ekranını görüntüler.", group: "Genel" },
  { key: "leads", label: "Lead Havuzu", description: "Lead kayıtlarını ve lead detaylarını görüntüler.", group: "Franchise" },
  { key: "appointments", label: "Randevu Oluşturma", description: "Randevu adayları ve randevu takip akışlarını yönetir.", group: "Franchise" },
  { key: "candidates", label: "Franchise Adayları", description: "Franchise aday listesi ve aday detaylarına erişir.", group: "Franchise" },
  { key: "pipeline", label: "Satış Süreci", description: "Pipeline ve satış aşamalarını görüntüler.", group: "Franchise" },
  { key: "tasks", label: "Görevler", description: "Görev ekranlarını ve takip aksiyonlarını kullanır.", group: "Operasyon" },
  { key: "documents", label: "Dokümanlar", description: "Dokümanları görüntüler ve indirir.", group: "Doküman" },
  { key: "documents.manage", label: "Doküman Yönetimi", description: "Doküman yükleme ve yönetim işlemlerini yapar.", group: "Doküman" },
  { key: "franchisees", label: "Bayi Kayıtları", description: "Bayi/franchisee kayıtlarına erişir.", group: "Şube" },
  { key: "branches", label: "Şubeler", description: "Şube listesi, ziyaretler ve şube detaylarına erişir.", group: "Şube" },
  { key: "branch_revenue", label: "Şube Ciroları", description: "Şube ciro ekranı ve ciro raporlarını kullanır.", group: "Şube" },
  { key: "branch_portal", label: "Şube Portalı", description: "Şube kullanıcılarının kendi portalına erişmesini sağlar.", group: "Şube" },
  { key: "openings", label: "Açılış Yönetimi", description: "Şube açılış projelerini ve görevlerini yönetir.", group: "Açılış" },
  { key: "operations", label: "Operasyon", description: "Operasyon denetimi ve operasyon modüllerini kullanır.", group: "Operasyon" },
  { key: "locations.view", label: "Aday Lokasyonları Görüntüleme", description: "Aday lokasyon kayıtlarını görüntüler.", group: "Lokasyon" },
  { key: "locations.create", label: "Aday Lokasyonu Oluşturma", description: "Yeni aday lokasyon kaydı oluşturur.", group: "Lokasyon" },
  { key: "locations.update", label: "Aday Lokasyonu Düzenleme", description: "Aday lokasyon bilgilerini günceller.", group: "Lokasyon" },
  { key: "locations.delete", label: "Aday Lokasyonu Silme", description: "Lokasyon silme işlemlerini yapar.", group: "Lokasyon" },
  { key: "locations.archive", label: "Aday Lokasyonu Arşivleme", description: "Lokasyon kayıtlarını arşive alır.", group: "Lokasyon" },
  { key: "locations.upload_document", label: "Lokasyon Belgesi Yükleme", description: "Lokasyon belgelerini yükler.", group: "Lokasyon" },
  { key: "locations.link_lead", label: "Lead-Lokasyon Bağlama", description: "Lead veya adayı lokasyonla eşleştirir.", group: "Lokasyon" },
  { key: "locations.view_financials", label: "Lokasyon Finansalları", description: "Lokasyon finansal bilgilerini görüntüler.", group: "Lokasyon" },
  { key: "orders", label: "Bayi Siparişleri", description: "Bayi sipariş ekranlarına erişir.", group: "Depo ve Lojistik" },
  { key: "order_admin", label: "Sipariş Yönetimi", description: "Merkez sipariş yönetimi işlemlerini yapar.", group: "Depo ve Lojistik" },
  { key: "procurement", label: "Satın Alma", description: "Satın alma ve tedarikçi modülünü kullanır.", group: "Satın Alma" },
  { key: "warehouse", label: "Depo", description: "Depo ekranlarına erişir.", group: "Depo ve Lojistik" },
  { key: "stock_manage", label: "Stok Yönetimi", description: "Stok hareketleri ve stok yönetimini yapar.", group: "Depo ve Lojistik" },
  { key: "shipment_manage", label: "Sevkiyat Yönetimi", description: "Sevkiyat ve backorder akışlarını yönetir.", group: "Depo ve Lojistik" },
  { key: "finance", label: "Finans", description: "Finans yönetimi ekranlarına erişir.", group: "Finans" },
  { key: "invoice", label: "Fatura İşlemleri", description: "Fatura ve entegrasyon işlemlerini yapar.", group: "Finans" },
  { key: "integrations", label: "Entegrasyonlar", description: "Entegrasyon ayarlarını ve loglarını yönetir.", group: "Sistem" },
  { key: "reports", label: "Raporlar", description: "Rapor ekranlarına erişir.", group: "Raporlama" },
  { key: "academy.view", label: "Akademi Görüntüleme", description: "Eğitim Akademisi içeriklerini görüntüler.", group: "Akademi" },
  { key: "academy.manage", label: "Akademi Yönetimi", description: "Eğitim oluşturma ve düzenleme işlemlerini yapar.", group: "Akademi" },
  { key: "academy.assign", label: "Akademi Atama", description: "Kullanıcı ve şubelere eğitim atar.", group: "Akademi" },
  { key: "academy.reports", label: "Akademi Raporları", description: "Eğitim ilerleme ve tamamlama raporlarını görür.", group: "Akademi" },
  { key: "academy.certificates", label: "Akademi Sertifikaları", description: "Sertifika altyapısına erişir.", group: "Akademi" },
  { key: "settings", label: "Ayarlar", description: "Genel sistem ayarlarına erişir.", group: "Sistem" },
  { key: "users", label: "Kullanıcı ve Rol Yönetimi", description: "Kullanıcı, rol ve yetki ekranlarını yönetir.", group: "Sistem" },
];

export const ALL_PERMISSIONS = all;

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  GENERAL_MANAGER: all.filter((permission) => permission !== "franchisees"),
  OPERATIONS_MANAGER: all.filter((permission) => !["settings", "users", "franchisees", "locations.delete", "locations.archive", "locations.view_financials"].includes(permission)),
  FRANCHISE_MANAGER: ["dashboard", "branch_portal", "tasks", "documents", "branches", "branch_revenue", "openings", "operations", "locations.view", "locations.link_lead", "academy.view", "academy.assign", "academy.reports"],
  WAREHOUSE_MANAGER: ["warehouse", "stock_manage", "shipment_manage", "procurement", "openings", "tasks", "academy.view"],
  MUHASEBE: ["dashboard", "orders", "order_admin", "procurement", "invoice", "integrations", "reports", "finance", "openings", "documents"],
  APPOINTMENT_DEPARTMENT: ["dashboard", "leads", "appointments", "candidates", "tasks", "locations.view", "locations.link_lead", "academy.view"],
  ARCHITECTURE_PROJECT_IMPLEMENTATION: ["dashboard", "openings", "branches", "tasks", "documents", "locations.view", "locations.create", "locations.update", "locations.upload_document", "academy.view"],
  ADVERTISING_OPERATIONS: ["dashboard", "leads", "appointments", "candidates", "pipeline", "reports", "integrations", "academy.view"],
  OPENING_COORDINATOR: ["dashboard", "openings", "tasks", "documents", "orders", "warehouse", "locations.view", "locations.create", "locations.update", "locations.upload_document", "locations.link_lead", "academy.view", "academy.assign", "academy.reports"],
  AUDITOR: ["dashboard", "operations", "openings", "tasks", "documents", "locations.view", "academy.view"],
  TRAINING_DEPARTMENT: ["dashboard", "academy.view", "academy.manage", "academy.assign", "academy.reports", "academy.certificates", "documents"],
  DOCUMENT_MANAGER: ["dashboard", "documents", "documents.manage", "academy.view", "academy.reports"],
  BRANCH_OWNER: ["operations", "academy.view"],
  BRANCH_MANAGER: ["operations", "academy.view"],
};

const BRANCH_ROLES = new Set(["BRANCH_OWNER", "BRANCH_MANAGER"]);
const BRANCH_ROLE_ALLOWED_PERMISSIONS = new Set<Permission>(["operations", "academy.view"]);

export function normalizePermissions(value: unknown, role?: string): Permission[] {
  const fallback = USER_ROLES.includes(role as UserRole) ? ROLE_PERMISSIONS[role as UserRole] : [];
  if (!Array.isArray(value)) return [...fallback];

  const allowed = new Set(all);
  const unique = new Set<Permission>();
  for (const item of value) {
    if (typeof item === "string" && allowed.has(item as Permission)) unique.add(item as Permission);
  }

  return [...unique];
}

export function hasPermission(role: string, permission: Permission, permissions?: readonly Permission[] | null) {
  if (BRANCH_ROLES.has(role) && !BRANCH_ROLE_ALLOWED_PERMISSIONS.has(permission)) return false;

  return effectivePermissionsForRole(role, permissions).includes(permission);
}

export function hasPermissionWithOverrides(role: string, permission: Permission, permissions?: readonly Permission[] | null) {
  return hasPermission(role, permission, permissions);
}

function effectivePermissionsForRole(role: string, permissions?: readonly Permission[] | null) {
  const defaults = USER_ROLES.includes(role as UserRole) ? ROLE_PERMISSIONS[role as UserRole] : [];
  if (!permissions?.length) return defaults;

  return [...new Set([...defaults, ...permissions])];
}

export function routePermission(path: string): Permission | null {
  if (path === "/" || path.startsWith("/dashboard")) return "dashboard";
  if (path.startsWith("/api/documents")) return "documents";
  if (path.startsWith("/settings/branch-concepts")) return "settings";
  if (path.startsWith("/settings/users")) return "users";
  if (path.startsWith("/integrations")) return "integrations";
  if (path.startsWith("/finance")) return "finance";
  if (path.startsWith("/operations")) return "operations";
  if (path.startsWith("/locations")) return "locations.view";
  if (path.startsWith("/settings")) return "settings";
  if (path.startsWith("/leads")) return "leads";
  if (path.startsWith("/branch-visits")) return "branches";
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

export function homeForRole(role: string) {
  if (role === "WAREHOUSE_MANAGER") return "/warehouse/orders";
  if (role === "APPOINTMENT_DEPARTMENT") return "/candidates";
  if (role === "ARCHITECTURE_PROJECT_IMPLEMENTATION") return "/openings";
  if (["BRANCH_OWNER", "BRANCH_MANAGER"].includes(role)) return "/operations";
  if (role === "FRANCHISE_MANAGER") return "/branch-portal";

  return "/";
}
