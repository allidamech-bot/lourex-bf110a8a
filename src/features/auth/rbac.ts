export const LOUREX_ROLES = [
  "owner",
  "turkish_partner",
  "saudi_partner",
  "operations_employee",
  "customer",
] as const;

export type LourexRole = (typeof LOUREX_ROLES)[number];

export type LourexPartnerType = "turkish" | "saudi" | null;
export type LourexAccountStatus = "active" | "inactive" | "pending";

export interface LourexProfile {
  id: string;
  email: string;
  fullName: string;
  role: LourexRole;
  partnerType: LourexPartnerType;
  status: LourexAccountStatus;
  phone?: string;
  country?: string;
  city?: string;
  createdAt: string;
  updatedAt: string;
}

export const INTERNAL_ROLES: LourexRole[] = [
  "owner",
  "turkish_partner",
  "saudi_partner",
  "operations_employee",
];

export const OWNER_ONLY_ROLES: LourexRole[] = ["owner"];

/**
 * Legacy broad accounting management roles.
 * Keep this for backward compatibility while the codebase migrates to the more precise accounting permission helpers below.
 */
export const ACCOUNTING_ROLES: LourexRole[] = ["owner", "operations_employee"];

export const ACCOUNTING_VIEW_ROLES: LourexRole[] = [
  "owner",
  "operations_employee",
  "saudi_partner",
];
export const ACCOUNTING_CREATE_ROLES: LourexRole[] = ["owner", "operations_employee"];
export const ACCOUNTING_EDIT_REQUEST_ROLES: LourexRole[] = ["owner", "operations_employee"];
export const ACCOUNTING_APPROVAL_ROLES: LourexRole[] = ["owner"];
export const ACCOUNTING_EXPORT_ROLES: LourexRole[] = ["owner", "operations_employee"];
export const ACCOUNTING_AUDIT_ROLES: LourexRole[] = ["owner", "operations_employee"];

export const PARTNER_ROLES: LourexRole[] = ["turkish_partner", "saudi_partner"];
export const OWNER_DASHBOARD_UI_ROLES: LourexRole[] = ["owner", "saudi_partner"];
export const ACCOUNTING_DASHBOARD_UI_ROLES: LourexRole[] = ACCOUNTING_VIEW_ROLES;
export const SYSTEM_DASHBOARD_UI_ROLES: LourexRole[] = ["owner", "operations_employee"];

export const dashboardRoutePermissions = {
  overview: INTERNAL_ROLES,
  requests: INTERNAL_ROLES,
  customers: [...OWNER_DASHBOARD_UI_ROLES, "operations_employee"] as LourexRole[],
  deals: INTERNAL_ROLES,
  tracking: INTERNAL_ROLES,
  accounting: ACCOUNTING_DASHBOARD_UI_ROLES,
  editRequests: ACCOUNTING_DASHBOARD_UI_ROLES,
  settlements: INTERNAL_ROLES,
  audit: INTERNAL_ROLES,
  reports: [...OWNER_DASHBOARD_UI_ROLES, "operations_employee"] as LourexRole[],
  system: SYSTEM_DASHBOARD_UI_ROLES,
} as const;

export const canAccessRole = (role: LourexRole | null | undefined, allowedRoles?: LourexRole[]) =>
  Boolean(role && (!allowedRoles || allowedRoles.includes(role)));

export const getPartnerTypeForRole = (role: LourexRole): LourexPartnerType =>
  role === "turkish_partner" ? "turkish" : role === "saudi_partner" ? "saudi" : null;

export const normalizePartnerTypeForRole = (
  role: LourexRole,
  partnerType?: string | null,
): LourexPartnerType => {
  const enforcedPartnerType = getPartnerTypeForRole(role);
  if (enforcedPartnerType) {
    return enforcedPartnerType;
  }

  return null;
};

export const isValidRole = (role: string | null | undefined): role is LourexRole =>
  typeof role === "string" && LOUREX_ROLES.includes(role as LourexRole);

export const isInternalRole = (role: LourexRole | null | undefined): role is LourexRole =>
  Boolean(role && INTERNAL_ROLES.includes(role));

export const getDefaultRouteForRole = (role: LourexRole) => {
  switch (role) {
    case "customer":
      return "/customer-portal";
    case "owner":
    case "turkish_partner":
    case "saudi_partner":
    case "operations_employee":
    default:
      return "/dashboard";
  }
};

// Permission Helpers
export const canManageUsers = (role: LourexRole) => role === "owner";
export const canManagePurchaseRequests = (role: LourexRole) => ["owner", "operations_employee"].includes(role);
export const canManageAccounting = (role: LourexRole) => ACCOUNTING_ROLES.includes(role);
export const canViewAccounting = (role: LourexRole) => ACCOUNTING_VIEW_ROLES.includes(role);
export const canCreateAccountingEntry = (role: LourexRole) => ACCOUNTING_CREATE_ROLES.includes(role);
export const canRequestAccountingEdit = (role: LourexRole) => ACCOUNTING_EDIT_REQUEST_ROLES.includes(role);
export const canApproveAccountingEdit = (role: LourexRole) => ACCOUNTING_APPROVAL_ROLES.includes(role);
export const canExportAccounting = (role: LourexRole) => ACCOUNTING_EXPORT_ROLES.includes(role);
export const canAuditAccounting = (role: LourexRole) => ACCOUNTING_AUDIT_ROLES.includes(role);
export const canViewPartnerArea = (role: LourexRole) => INTERNAL_ROLES.includes(role);
export const canViewCustomerArea = (role: LourexRole) => role === "customer" || INTERNAL_ROLES.includes(role);
