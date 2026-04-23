import { describe, it, expect } from "vitest";
import { 
  canAccessRole, 
  isInternalRole, 
  isValidRole, 
  canManageUsers, 
  canManageAccounting,
  INTERNAL_ROLES,
  ACCOUNTING_ROLES
} from "@/features/auth/rbac";

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
      INTERNAL_ROLES.forEach(role => {
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

    it("canManageAccounting should return true for accounting roles", () => {
      ACCOUNTING_ROLES.forEach(role => {
        expect(canManageAccounting(role)).toBe(true);
      });
      expect(canManageAccounting("turkish_partner")).toBe(false);
      expect(canManageAccounting("customer")).toBe(false);
    });
  });
});
