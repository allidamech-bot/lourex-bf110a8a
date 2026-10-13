import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20261013151047_lourex_emergency_public_access_lockdown_20261013.sql",
  "utf8",
);

// These are static regression checks only; real SQL RLS tests were executed
// against the live database separately and must be re-run after future edits.
describe("emergency LOUREX public-access lockdown migration", () => {
  it("removes anonymous customer and audit disclosure", () => {
    expect(sql).toContain('DROP POLICY IF EXISTS "Allow public select purchase_requests"');
    expect(sql).toContain('DROP POLICY IF EXISTS "Allow public select audit_logs"');
    expect(sql).toContain("ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;");
  });

  it("preserves the authenticated customer request and internal audit workflows", () => {
    expect(sql).toContain("Customers can view own purchase requests");
    expect(sql).toContain("Internal Lourex roles can insert audit logs");
    expect(sql).toContain('CREATE POLICY "Lourex owner and operations can read audit logs"');
    expect(sql).toContain("ARRAY['owner','operations_employee']");
  });

  it("does not expose private storage objects or permit broad anonymous uploads", () => {
    expect(sql).toContain('DROP POLICY IF EXISTS "Allow public read storage objects"');
    expect(sql).toContain('DROP POLICY IF EXISTS "Public can upload product images (public)"');
    expect(sql).toContain("Public can upload purchase request product images");
  });

  it("includes explicit prerequisite checks and a postcondition assertion", () => {
    expect(sql).toContain("Missing customer self-read policy: aborting");
    expect(sql).toContain("Missing internal audit insert policy: aborting");
    expect(sql).toContain("Legacy public policy still exists");
  });
});
