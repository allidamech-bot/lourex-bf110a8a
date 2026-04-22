import type { LourexProfile, LourexRole } from "@/features/auth/rbac";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

type IdentityProfile = Pick<LourexProfile, "role" | "partnerType">;

export const getRoleDisplayName = (role: LourexRole, t: Translate) => t(`identity.roles.${role}`);

export const getEntityLabel = (profile: IdentityProfile, t: Translate) => {
  switch (profile.role) {
    case "owner":
      return t("identity.entities.general_management");
    case "saudi_partner":
      return t("identity.entities.saudi_partner");
    default:
      return null;
  }
};

export const getWorkspaceTitle = (profile: IdentityProfile, t: Translate) => {
  switch (profile.role) {
    case "owner":
      return t("identity.workspaces.owner.title");
    case "saudi_partner":
      return t("identity.workspaces.saudi_partner.title");
    case "operations_employee":
      return t("identity.workspaces.operations_employee.title");
    case "customer":
    default:
      return t("identity.workspaces.customer.title");
  }
};

export const getWorkspaceDescription = (profile: IdentityProfile, t: Translate) => {
  switch (profile.role) {
    case "owner":
      return t("identity.workspaces.owner.description");
    case "saudi_partner":
      return t("identity.workspaces.saudi_partner.description");
    case "operations_employee":
      return t("identity.workspaces.operations_employee.description");
    case "customer":
    default:
      return t("identity.workspaces.customer.description");
  }
};
