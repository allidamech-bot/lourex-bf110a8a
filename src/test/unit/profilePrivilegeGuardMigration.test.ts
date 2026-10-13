import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20261013160000_r1_profile_privilege_guard.sql",
  "utf8",
);

describe("R1 profile privilege escalation boundary", () => {
  it("protects both self INSERT and UPDATE paths, not just UI controls", () => {
    expect(sql).toContain("BEFORE INSERT OR UPDATE ON public.profiles");
    expect(sql).toContain("IF TG_OP = 'INSERT'");
    expect(sql).toContain("ELSIF TG_OP = 'UPDATE'");
    expect(sql).toContain("current_user <> 'authenticated'");
  });

  it("prevents untrusted users from setting every privileged account field", () => {
    for (const field of ["role", "partner_type", "status", "verification_status", "verified_at"]) {
      expect(sql).toContain(`NEW.${field} IS DISTINCT FROM OLD.${field}`);
    }
    expect(sql).toContain("NEW.role IS DISTINCT FROM 'customer'");
    expect(sql).toContain("NEW.status IS DISTINCT FROM 'active'");
    expect(sql).toContain("NEW.verification_status IS DISTINCT FROM 'pending'");
  });

  it("keeps the trigger function invoker-scoped with no exposed RPC grants", () => {
    expect(sql).toContain("SECURITY INVOKER");
    expect(sql).toContain("SET search_path = ''");
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.guard_profile_privilege_fields() FROM PUBLIC, anon, authenticated",
    );
    expect(sql).not.toContain("UPDATE public.profiles SET");
  });
});
