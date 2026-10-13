import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20261013152740_lourex_fix_customer_request_helper_identity_20261013.sql",
  "utf8",
);

describe("LOUREX legacy customer identity helper", () => {
  it("supports the current customer record to auth user mapping", () => {
    expect(sql).toContain("LEFT JOIN public.lourex_customers c ON c.id = pr.customer_id");
    expect(sql).toContain("c.auth_user_id = auth.uid()");
    expect(sql).toContain("pr.customer_id = auth.uid()");
  });

  it("is bound to caller identity rather than caller-supplied user IDs", () => {
    expect(sql).toContain("auth.uid() IS NOT NULL");
    expect(sql).toContain("p_request_id uuid");
    expect(sql).not.toContain("p_user_id uuid");
  });

  it("limits privileged function execution to authenticated callers", () => {
    expect(sql).toContain("SET search_path = ''");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.customer_can_access_purchase_request(uuid) FROM PUBLIC, anon");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.customer_can_access_purchase_request(uuid) TO authenticated");
  });
});
