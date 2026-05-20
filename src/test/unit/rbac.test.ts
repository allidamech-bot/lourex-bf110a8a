import { describe, it, expect } from "vitest";
import {
  canAccessRole,
  isInternalRole,
  isValidRole,
  canManageUsers,
  canManageAccounting,
  canViewAccounting,
  canCreateAccountingEntry,
  canRequestAccountingEdit,
  canApproveAccountingEdit,
  canExportAccounting,
  canAuditAccounting,
  getPartnerTypeForRole,
  normalizePartnerTypeForRole,
  INTERNAL_ROLES,
  ACCOUNTING_ROLES,
  ACCOUNTING_VIEW_ROLES,
  ACCOUNTING_CREATE_ROLES,
  ACCOUNTING_EDIT_REQUEST_ROLES,
  ACCOUNTING_APPROVAL_ROLES,
  ACCOUNTING_EXPORT_ROLES,
  ACCOUNTING_AUDIT_ROLES,
  type LourexRole,
} from "@/features/auth/rbac";

const ALL_ROLES: LourexRole[] = ["owner", "operations_employee", "saudi_partner", "turkish_partner", "customer"];

const expectOnlyRoles = (
  helper: (role: LourexRole) => boolean,
  allowedRoles: LourexRole[],
) => {
  ALL_ROLES.forEach((role) => {
    expect(helper(role), `${role} permission mismatch`).toBe(allowedRoles.includes(role));
  });
};

describe("RBAC System", () => {
  describe("canAccessRole", () => {
    it("should return true if role is allowed", () => {
      expect(canAccessRole("owner", ["owner", "operations_employee"])).toBe(true);
    });

    it("should return false if role is not allowed", () => {
      expect(canAccessRole("customer", ["owner", "operations_employee"])).toBe(false);
    });

    it("should return true if allowedRoles is undefined", () => {
      expect(canAccessRole("customer")).toBe(true);
    });

    it("should return false if role is null/undefined", () => {
      expect(canAccessRole(null)).toBe(false);
      expect(canAccessRole(undefined)).toBe(false);
    });
  });

  describe("isValidRole", () => {
    it("should return true for official roles", () => {
      expect(isValidRole("owner")).toBe(true);
      expect(isValidRole("customer")).toBe(true);
    });

    it("should return false for legacy or invalid roles", () => {
      expect(isValidRole("admin")).toBe(false);
      expect(isValidRole("manager")).toBe(false);
      expect(isValidRole("random")).toBe(false);
    });
  });

  describe("isInternalRole", () => {
    it("should return true for internal roles", () => {
      INTERNAL_ROLES.forEach((role) => {
        expect(isInternalRole(role)).toBe(true);
      });
    });

    it("should return false for customer", () => {
      expect(isInternalRole("customer")).toBe(false);
    });
  });

  describe("Permission Helpers", () => {
    it("canManageUsers should only return true for owner", () => {
      expect(canManageUsers("owner")).toBe(true);
      expect(canManageUsers("operations_employee")).toBe(false);
      expect(canManageUsers("customer")).toBe(false);
    });

    it("canManageAccounting should return true for legacy accounting management roles", () => {
      ACCOUNTING_ROLES.forEach((role) => {
        expect(canManageAccounting(role)).toBe(true);
      });
      expect(canManageAccounting("turkish_partner")).toBe(false);
      expect(canManageAccounting("customer")).toBe(false);
    });

    it("normalizes partner type from the official active role model", () => {
      expect(getPartnerTypeForRole("turkish_partner")).toBe("turkish");
      expect(getPartnerTypeForRole("saudi_partner")).toBe("saudi");
      expect(getPartnerTypeForRole("owner")).toBeNull();
      expect(normalizePartnerTypeForRole("customer", "saudi")).toBeNull();
      expect(normalizePartnerTypeForRole("turkish_partner", null)).toBe("turkish");
    });
  });

  describe("Granular accounting permissions", () => {
    it("allows accounting view only for owner, operations, and scoped Saudi partner", () => {
      expect(ACCOUNTING_VIEW_ROLES).toEqual(["owner", "operations_employee", "saudi_partner"]);
      expectOnlyRoles(canViewAccounting, ACCOUNTING_VIEW_ROLES);
    });

    it("allows accounting entry creation only for owner and operations", () => {
      expect(ACCOUNTING_CREATE_ROLES).toEqual(["owner", "operations_employee"]);
      expectOnlyRoles(canCreateAccountingEntry, ACCOUNTING_CREATE_ROLES);
    });

    it("allows accounting edit requests only for owner and operations", () => {
      expect(ACCOUNTING_EDIT_REQUEST_ROLES).toEqual(["owner", "operations_employee"]);
      expectOnlyRoles(canRequestAccountingEdit, ACCOUNTING_EDIT_REQUEST_ROLES);
    });

    it("allows accounting edit approval only for owner", () => {
      expect(ACCOUNTING_APPROVAL_ROLES).toEqual(["owner"]);
      expectOnlyRoles(canApproveAccountingEdit, ACCOUNTING_APPROVAL_ROLES);
    });

    it("allows accounting export only for owner and operations", () => {
      expect(ACCOUNTING_EXPORT_ROLES).toEqual(["owner", "operations_employee"]);
      expectOnlyRoles(canExportAccounting, ACCOUNTING_EXPORT_ROLES);
    });

    it("allows accounting audit only for owner and operations", () => {
      expect(ACCOUNTING_AUDIT_ROLES).toEqual(["owner", "operations_employee"]);
      expectOnlyRoles(canAuditAccounting, ACCOUNTING_AUDIT_ROLES);
    });

    it("does not let customer or Turkish partner access accounting capabilities", () => {
      (["customer", "turkish_partner"] as LourexRole[]).forEach((role) => {
        expect(canViewAccounting(role)).toBe(false);
        expect(canCreateAccountingEntry(role)).toBe(false);
        expect(canRequestAccountingEdit(role)).toBe(false);
        expect(canApproveAccountingEdit(role)).toBe(false);
        expect(canExportAccounting(role)).toBe(false);
        expect(canAuditAccounting(role)).toBe(false);
      });
    });

    it("keeps Saudi partner accounting as scoped view-only", () => {
      expect(canViewAccounting("saudi_partner")).toBe(true);
      expect(canCreateAccountingEntry("saudi_partner")).toBe(false);
      expect(canRequestAccountingEdit("saudi_partner")).toBe(false);
      expect(canApproveAccountingEdit("saudi_partner")).toBe(false);
      expect(canExportAccounting("saudi_partner")).toBe(false);
      expect(canAuditAccounting("saudi_partner")).toBe(false);
    });
  });
});
