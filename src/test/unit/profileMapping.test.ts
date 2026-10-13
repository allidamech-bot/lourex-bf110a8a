import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";
import { mapProfileRow } from "@/features/auth/profileMapping";

const user = {
  id: "auth-user-a",
  email: "a@example.test",
  user_metadata: { full_name: "Account A" },
} as unknown as User;

const row = {
  id: user.id,
  role: "customer",
  status: "active",
  full_name: "Customer A",
  created_at: "2026-10-13T00:00:00.000Z",
};

describe("R2 fail-closed account profile mapping", () => {
  it("keeps valid statuses without defaulting unknown values to active", () => {
    expect(mapProfileRow(row, user)?.status).toBe("active");
    expect(mapProfileRow({ ...row, status: "inactive" }, user)?.status).toBe("inactive");
    expect(mapProfileRow({ ...row, status: "pending" }, user)?.status).toBe("pending");
    expect(mapProfileRow({ ...row, status: "disabled" }, user)).toBeNull();
    expect(mapProfileRow({ ...row, status: null }, user)).toBeNull();
    expect(mapProfileRow({ ...row, status: "" }, user)).toBeNull();
  });

  it("never accepts a profile from another authentication identity", () => {
    expect(mapProfileRow({ ...row, id: "another-auth-user" }, user)).toBeNull();
    expect(mapProfileRow({ ...row, id: null }, user)).toBeNull();
    expect(mapProfileRow({ ...row, role: "unknown" }, user)).toBeNull();
  });

  it("accepts legacy Turkish partner type and enforces the actual role", () => {
    expect(mapProfileRow({ ...row, role: "turkish_partner", partner_type: "turkey" }, user)?.partnerType).toBe("turkish");
    expect(mapProfileRow({ ...row, role: "turkish_partner", partner_type: "saudi" }, user)?.partnerType).toBe("turkish");
    expect(mapProfileRow({ ...row, role: "saudi_partner", partner_type: "turkey" }, user)?.partnerType).toBe("saudi");
  });
});
