import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20261013152124_lourex_customer_attachment_ownership_guard_20261013.sql",
  "utf8",
);

// Source regression tests; role-level INSERT/deny tests have also been
// executed in rollback transactions against the connected live Supabase DB.
describe("LOUREX request image attachment ownership hotfix", () => {
  it("closes anonymous INSERT of arbitrary purchase-request attachments", () => {
    expect(sql).toContain('DROP POLICY IF EXISTS "Public purchase request attachments can be inserted"');
    expect(sql).toContain("REVOKE INSERT ON public.attachments FROM anon;");
  });

  it("permits authenticated users to add metadata only for owned requests", () => {
    expect(sql).toContain('CREATE POLICY "Customers can insert own request product images"');
    expect(sql).toContain("AND entity_type = 'purchase_request'");
    expect(sql).toContain("AND category = 'product_image'");
    expect(sql).toContain("AND visibility = 'internal'");
    expect(sql).toContain("AND (uploaded_by IS NULL OR uploaded_by = auth.uid())");
    expect(sql).toContain("AND c.auth_user_id = auth.uid()");
  });

  it("allows customers to read their own product image metadata", () => {
    expect(sql).toContain('CREATE POLICY "Customers can read own request product image metadata"');
    expect(sql).toContain("WHERE pr.id = attachments.entity_id");
  });

  it("has dependency and postcondition guards", () => {
    expect(sql).toContain("Expected legacy attachment policy absent");
    expect(sql).toContain("Customer write permission missing");
  });
});
