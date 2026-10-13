import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20261013223000_r1_secure_transfer_proof_workflow.sql",
  "utf8",
);

describe("R1 verified transfer proof workflow", () => {
  it("preserves historic statuses and adds the pending/rejected lifecycle", () => {
    for (const status of [
      "converted_to_deal",
      "ready_for_conversion",
      "transfer_proof_pending",
      "transfer_proof_rejected",
      "in_progress",
    ]) expect(sql).toContain(status);
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS transfer_proof_url");
  });

  it("requires the authenticated customer-to-record relation, never contact email", () => {
    expect(sql).toContain("c.auth_user_id=v_actor");
    expect(sql).not.toContain("v_request.email");
    expect(sql).toContain("NOT_OWNER:");
    expect(sql).toContain("public.is_lourex_role");
  });

  it("rejects paths outside request scope and verifies the Storage object owner", () => {
    expect(sql).toContain("request_id::text||'/transfer-proof/%'");
    expect(sql).toContain("o.bucket_id='transfer-proofs'");
    expect(sql).toContain("o.name=v_path");
    expect(sql).toContain("v_uploaded_by IS DISTINCT FROM v_actor::text");
  });

  it("uses a definer RPC and limits direct proof mutations", () => {
    expect(sql).toContain("SET search_path=''");
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("REVOKE INSERT, DELETE ON public.transfer_proofs");
    expect(sql).toContain("TO authenticated");
    expect(sql).toContain("WHERE status='pending_review'");
  });
});
