export type LourexRole =
  | "owner"
  | "turkish_partner"
  | "saudi_partner"
  | "operations_employee"
  | "customer";

export type LourexPartnerType = "turkey" | "saudi" | null;
export type LourexAccountStatus = "active" | "inactive" | "pending";

export interface LourexProfile {
  id: string;
  email: string;
  fullName: string;
  role: LourexRole;
  partnerType: LourexPartnerType;
  status: LourexAccountStatus;
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
export const ACCOUNTING_ROLES: LourexRole[] = ["owner", "operations_employee"];
export const PARTNER_ROLES: LourexRole[] = ["turkish_partner", "saudi_partner"];

export const roleLabels: Record<LourexRole, { en: string; ar: string }> = {
  owner: { en: "Owner / General Manager", ar: "المالك / المدير العام" },
  turkish_partner: { en: "Turkish Partner", ar: "الشريك التركي" },
  saudi_partner: { en: "Saudi Partner", ar: "الشريك السعودي" },
  operations_employee: { en: "Operations Employee", ar: "موظف العمليات" },
  customer: { en: "Customer", ar: "العميل" },
};

export const dashboardRoutePermissions = {
  overview: INTERNAL_ROLES,
  requests: ["owner", "operations_employee"] as LourexRole[],
  customers: ["owner", "operations_employee"] as LourexRole[],
  deals: INTERNAL_ROLES,
  tracking: INTERNAL_ROLES,
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
      return "/request";
    case "owner":
    case "turkish_partner":
    case "saudi_partner":
    case "operations_employee":
    default:
      return "/dashboard";
  }
};
