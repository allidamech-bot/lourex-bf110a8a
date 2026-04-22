export type LourexRole =
  | "owner"
  | "saudi_partner"
  | "operations_employee"
  | "customer";

export type LourexPartnerType = "saudi" | null;
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
  "saudi_partner",
  "operations_employee",
];

export const OWNER_ONLY_ROLES: LourexRole[] = ["owner"];
export const ACCOUNTING_ROLES: LourexRole[] = ["owner", "operations_employee"];
export const PARTNER_ROLES: LourexRole[] = ["saudi_partner"];

export const dashboardRoutePermissions = {
  overview: INTERNAL_ROLES,
  requests: [...INTERNAL_ROLES, "customer"] as LourexRole[],
  customers: ["owner", "operations_employee"] as LourexRole[],
  deals: INTERNAL_ROLES,
  tracking: [...INTERNAL_ROLES, "customer"] as LourexRole[],
  accounting: ACCOUNTING_ROLES,
  editRequests: ACCOUNTING_ROLES,
  audit: INTERNAL_ROLES,
  reports: ["owner", "operations_employee"] as LourexRole[],
} as const;

export const canAccessRole = (role: LourexRole | null | undefined, allowedRoles?: LourexRole[]) =>
  Boolean(role && (!allowedRoles || allowedRoles.includes(role)));

export const isInternalRole = (role: LourexRole | null | undefined): role is LourexRole =>
  Boolean(role && INTERNAL_ROLES.includes(role));

export const getDefaultRouteForRole = (role: LourexRole) => {
  switch (role) {
    case "customer":
      return "/customer-portal";
    case "owner":
    case "saudi_partner":
    case "operations_employee":
    default:
      return "/dashboard";
  }
};
