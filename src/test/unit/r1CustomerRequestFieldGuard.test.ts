import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20261013224500_r1_customer_purchase_request_column_guard.sql",
  "utf8",
);
const domain = readFileSync("src/lib/operationsDomain.ts", "utf8");
const reply = domain.slice(
  domain.indexOf("export const submitPurchaseRequestClarificationReply"),
  domain.indexOf("export const updatePurchaseRequestInternalNotes"),
);

describe("R1 customer request field protection", () => {
  it("blocks direct authenticated edits of every non-allowlisted field", () => {
    expect(sql).toContain("CREATE TRIGGER lourex_r1_guard_customer_request_updates");
    expect(sql).toContain("current_user <> 'authenticated'");
    expect(sql).toContain("to_jsonb(NEW) - ARRAY[");
    expect(sql).toContain("CUSTOMER_FIELD_PROTECTED");
    expect(sql).not.toContain("'transfer_proof_status','updated_at'");
    expect(sql).not.toContain("'status','updated_at'");
  });

  it("preserves customer archive and editing of non-privileged request fields", () => {
    expect(sql).toContain("'customer_hidden_at','updated_at'");
    expect(sql).toContain("'image_urls'");
    expect(sql).toContain("'product_description'");
  });

  it("moves customer clarification to a verified atomic RPC", () => {
    expect(sql).toContain("public.submit_purchase_request_clarification_reply");
    expect(sql).toContain("AND c.auth_user_id=v_actor");
    expect(sql).toContain("WHERE id=p_request_id FOR UPDATE");
    expect(sql).toContain("IF NOT FOUND OR v_request.status <> 'awaiting_clarification'");
    expect(reply).toContain('db.rpc("submit_purchase_request_clarification_reply"');
    expect(reply).not.toContain('.from("purchase_requests")\n      .update({');
  });

  it("does not expose privileged RPC to anonymous users", () => {
    expect(sql).toContain("FROM PUBLIC,anon");
    expect(sql).toContain("TO authenticated");
  });
});
