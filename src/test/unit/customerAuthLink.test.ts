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

  it("never authorizes transfer proof signed URLs by contact email or matching auth UUID to customer PK", () => {
    const source = readFileSync("src/domain/transferProofs/access.ts", "utf8");
    expect(source).toContain('.eq("id", request.customer_id)');
    expect(source).toContain('.eq("auth_user_id", user.id)');
    expect(source).toContain("isCustomerLinkedToUser(linkedCustomer, user.id)");
    expect(source).not.toContain("request.customer_id === user.id");
    expect(source).not.toContain("userEmail === requestEmail");
    expect(source).not.toContain('select("id, customer_id, email, transfer_proof_url")');
  });

  it("scopes customer notification events and purchase requests by the linked customer record", () => {
    const source = readFileSync("src/domain/notifications/customerInbox.ts", "utf8");
    expect(source).toContain('.eq("auth_user_id", user.id)');
    expect(source).toContain('const customerId = linkedCustomer?.auth_user_id === user.id ? linkedCustomer.id : null');
    expect(source).toContain('.eq("customer_id", customerId)');
    expect(source).not.toContain('.eq("customer_id", user.id)');
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
    expect(source).toContain("const ownsRequest = Boolean(customer?.id && request.customer_id === customer.id)");
    expect(source).not.toContain("request.customer_id === user.id ||");
    expect(source).not.toContain("requestEmail === userEmail");
    expect(source).not.toContain("request.customer_id || user.id");
    expect(source).toContain('.eq("id", upsertedCustomer.data.customer_id)');
    expect(source).not.toContain('.eq("email", userEmail)');
    expect(source).not.toContain("return upserted.data || byEmail.data");
    expect(source).toContain("return linkedCustomer.data;");
  });
});
