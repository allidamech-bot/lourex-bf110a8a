import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20261013160500_r1_customer_upsert_verified_identity.sql",
  "utf8",
);

describe("R1 customer upsert ownership migration", () => {
  it("uses authenticated and verified email identity, never caller-supplied email", () => {
    expect(sql).toContain("FROM auth.users AS u");
    expect(sql).toContain("u.email_confirmed_at IS NOT NULL");
    expect(sql).toContain("WHERE c.auth_user_id = v_auth_user_id");
    expect(sql).toContain("c.auth_user_id IS NULL");
    expect(sql).toContain("v_email_confirmed");
    expect(sql).not.toMatch(/lower\s*\(\s*(?:trim|btrim)\s*\(\s*p_email/);
  });

  it("never reassigns or modifies another authenticated customer's row", () => {
    expect(sql).toContain("c.auth_user_id IS NULL OR c.auth_user_id = v_auth_user_id");
    expect(sql).toContain("RAISE EXCEPTION 'The customer record is not owned by this account.'");
  });

  it("retains the RPC signature and denies anonymous execution", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.upsert_current_customer_record(");
    expect(sql).toContain("SET search_path = ''");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.upsert_current_customer_record(text,text,text,text,text)");
    expect(sql).toContain("FROM PUBLIC, anon");
    expect(sql).toContain("TO authenticated");
  });
});
