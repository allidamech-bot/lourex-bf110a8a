import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20261013160000_r1_profile_privilege_guard.sql",
  "utf8",
);

describe("R1 profile privilege escalation boundary", () => {
  it("guards both self INSERT and UPDATE paths without blocking owner administration", () => {
    expect(sql).toContain("BEFORE INSERT OR UPDATE ON public.profiles");
    expect(sql).toContain("IF TG_OP = 'INSERT'");
    expect(sql).toContain("ELSIF TG_OP = 'UPDATE'");
    expect(sql).toContain("v_owner := public.is_lourex_role(v_actor, ARRAY['owner'])");
    expect(sql).toContain("IF NOT v_owner AND");
    expect(sql).toContain('CREATE POLICY "Active owner can manage profile access"');
    expect(sql).toContain('CREATE POLICY "Active owner can view profiles"');
  });

  it("protects each privileged account field against untrusted self edits", () => {
    for (const field of ["role", "partner_type", "status", "verification_status", "verified_at"]) {
      expect(sql).toContain(`NEW.${field} IS DISTINCT FROM OLD.${field}`);
    }
    expect(sql).toContain("NEW.role IS DISTINCT FROM 'customer'");
    expect(sql).toContain("NEW.status IS DISTINCT FROM 'active'");
    expect(sql).toContain("NEW.verification_status IS DISTINCT FROM 'pending'");
  });

  it("preserves a live owner under concurrent role/status changes", () => {
    expect(sql).toContain("OLD.role = 'owner'");
    expect(sql).toContain("OLD.status = 'active'");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("p.role = 'owner' AND p.status = 'active'");
    expect(sql).toContain("Cannot disable or downgrade the final active owner");
  });

  it("locks privileged trigger execution down and preserves searchable schema boundaries", () => {
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("SET search_path = ''");
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.guard_profile_privilege_fields() FROM PUBLIC, anon, authenticated",
    );
    expect(sql).not.toContain("UPDATE public.profiles SET");
  });
});
