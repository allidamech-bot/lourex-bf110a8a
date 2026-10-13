import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isCustomerLinkedToUser } from "@/domain/customers/identity";

describe("R1-F customer authentication link", () => {
  it("accepts a linked customer whose record ID differs from the login ID", () => {
    expect(isCustomerLinkedToUser({ auth_user_id: "auth-a" }, "auth-a")).toBe(true);
  });

  it("rejects an unrelated or unlinked customer regardless of matching record IDs", () => {
    expect(isCustomerLinkedToUser({ auth_user_id: "auth-b" }, "auth-a")).toBe(false);
    expect(isCustomerLinkedToUser({ auth_user_id: null }, "auth-a")).toBe(false);
    expect(isCustomerLinkedToUser(null, "auth-a")).toBe(false);
    expect(isCustomerLinkedToUser({ auth_user_id: "auth-a" }, null)).toBe(false);
  });

  it("does not assume customer primary keys are Supabase authentication IDs", () => {
    const source = readFileSync("src/lib/operationsDomain.ts", "utf8");
    expect(source).toContain('.eq("auth_user_id", user.id)');
    expect(source).toContain('.eq("id", customerId)');
    expect(source).toContain("isCustomerLinkedToUser(linkedCustomer.data, user.id)");
    expect(source).toContain("inserted.data.customer_id !== customerId");
    expect(source).not.toContain("customerId !== user.id");
    expect(source).not.toContain("inserted.data.customer_id !== user.id");
    expect(source).not.toContain("customerRecord?.id || user?.id");
  });
});
