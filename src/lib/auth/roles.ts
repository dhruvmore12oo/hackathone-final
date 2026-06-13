export const USER_ROLES = [
  "ADMIN",
  "BUSINESS_OWNER",
  "SALES_USER",
  "PURCHASE_USER",
  "MANUFACTURING_USER",
  "INVENTORY_MANAGER",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ADMIN_BOOTSTRAP_EMAIL = "dhruvmoreutk@gmail.com";

export const rolePermissions: Record<UserRole, string[]> = {
  ADMIN: ["*"],
  BUSINESS_OWNER: [
    "dashboard:read",
    "products:read", "products:write",
    "inventory:read",
    "sales:read",
    "purchase:read",
    "manufacturing:read",
    "bom:read",
    "vendors:read",
    "audit_logs:read",
    "approvals:manage", "approvals:read"
  ],
  SALES_USER: [
    "dashboard:read",
    "products:read",
    "inventory:read",
    "sales:read", "sales:write", "sales:create", "sales:edit_own", "sales:delete"
  ],
  PURCHASE_USER: [
    "dashboard:read",
    "products:read",
    "purchase:read", "purchase:write", "purchase:create", "purchase:edit_own", "purchase:delete",
    "vendors:read", "vendors:write"
  ],
  MANUFACTURING_USER: [
    "dashboard:read",
    "manufacturing:read", "manufacturing:write", "manufacturing:production_entry", "manufacturing:update_progress", "manufacturing:complete_wo",
    "bom:read"
  ],
  INVENTORY_MANAGER: [
    "dashboard:read",
    "products:read",
    "inventory:read", "inventory:write", "inventory:adjust_stock"
  ],
};

export function hasPermission(role: UserRole, permission: string) {
  const permissions = rolePermissions[role];
  return permissions.includes("*") || permissions.includes(permission);
}

export const roleLabels: Record<UserRole, string> = {
  ADMIN: "Admin",
  BUSINESS_OWNER: "Business Owner",
  SALES_USER: "Sales Manager",
  PURCHASE_USER: "Purchase Manager",
  MANUFACTURING_USER: "Manufacturing Operator",
  INVENTORY_MANAGER: "Inventory Manager",
};
