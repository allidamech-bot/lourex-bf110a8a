import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20261013221500_r1_private_commercial_documents.sql",
  "utf8",
);

describe("R1 private commercial storage", () => {
  it("provisions documents and transfer proofs as private buckets", () => {
    expect(sql).toContain("('documents','documents',false");
    expect(sql).toContain("('transfer-proofs','transfer-proofs',false");
    expect(sql).toContain("file_size_limit");
  });

  it("does not trust request contact email and scopes proof access to auth linkage", () => {
    expect(sql).toContain("c.auth_user_id = auth.uid()");
    expect(sql).toContain("public.is_lourex_role(auth.uid(),ARRAY['customer'])");
    expect(sql).toContain("split_part(p_path,'/',4) = 'transfer-proof'");
    expect(sql).not.toContain("pr.email =");
  });

  it("keeps public product images but retires legacy deal-document policies", () => {
    expect(sql).toContain("DROP POLICY IF EXISTS \"Internal deal attachments can be uploaded\"");
    expect(sql).toContain("DROP POLICY IF EXISTS \"Internal deal attachments can be updated\"");
    expect(sql).toContain("DROP POLICY IF EXISTS \"Internal deal attachments can be deleted\"");
    expect(sql).not.toContain("UPDATE storage.buckets SET public");
  });

  it("does not expose private proof access to anonymous visitors", () => {
    expect(sql).toContain("FROM PUBLIC, anon");
    expect(sql).toContain("FOR SELECT TO authenticated");
    expect(sql).toContain("FOR INSERT TO authenticated");
    expect(sql).not.toContain("CREATE POLICY \"LOUREX R1 proof delete\"");
  });
});
