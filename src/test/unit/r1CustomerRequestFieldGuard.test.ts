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

  it("limits cancellation to active staff and the actual request customer", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.cancel_purchase_request");
    expect(sql).toContain("v_is_staff := public.is_lourex_role(v_actor,ARRAY['owner','operations_employee'])");
    expect(sql).toContain("v_is_customer := public.is_lourex_role(v_actor,ARRAY['customer'])");
    expect(sql).toContain("c.id=v_request.customer_id AND c.auth_user_id=v_actor");
    expect(sql).toContain("status NOT IN ('intake_submitted','awaiting_clarification')");
    expect(sql).not.toContain("v_user_role IN ('owner', 'operations_employee', 'turkish_partner'");
  });

  it("denies forged payment approval in customer-created requests while preserving tracking IDs", () => {
    expect(sql).toContain("CREATE TRIGGER lourex_r1_guard_customer_request_inserts");
    expect(sql).toContain("NEW.status IS DISTINCT FROM 'intake_submitted'");
    expect(sql).toContain("OR NEW.transfer_proof_status IS NOT NULL");
    expect(sql).toContain("OR NEW.transfer_accepted_by IS NOT NULL");
    expect(sql).toContain("CUSTOMER_INSERT_PROTECTED");
    expect(sql).not.toContain("OR NEW.tracking_code IS NOT NULL");
  });

  it("keeps catalog product references outside privileged staff-only notes", () => {
    const form = readFileSync("src/features/purchase-requests/components/PurchaseRequestForm.tsx", "utf8");
    const creation = form.slice(form.indexOf("const creationResult = await createPurchaseRequestWithAttachments"));
    expect(creation).toContain("sourceProduct.slug");
    expect(creation).not.toContain("internalNotes: sourceProduct");
  });

  it("records authenticated request submissions through a narrow audit trigger", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.log_purchase_request_submission()");
    expect(sql).toContain("LANGUAGE plpgsql SECURITY DEFINER");
    expect(sql).toContain("INSERT INTO public.audit_logs");
    expect(sql).toContain("auth.uid(),");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.log_purchase_request_submission()");
  });

  it("does not expose privileged RPC to anonymous users", () => {
    expect(sql).toContain("FROM PUBLIC,anon");
    expect(sql).toContain("TO authenticated");
  });
});
