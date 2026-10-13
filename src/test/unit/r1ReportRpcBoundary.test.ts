import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20261013163000_r1_global_reporting_owner_ops_only.sql",
  "utf8",
);

describe("R1 privileged global reporting boundary", () => {
  const reports = [
    "lourex_report_summary",
    "lourex_report_top_customers",
    "lourex_report_top_expense_categories",
  ];

  it("keeps all three existing SQL RPC interfaces but removes broad partner authorization", () => {
    reports.forEach((report) => {
      expect(sql).toContain(`CREATE OR REPLACE FUNCTION public.${report}(`);
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${report}(`);
      expect(sql).toContain(`GRANT EXECUTE ON FUNCTION public.${report}(`);
    });
    expect(sql.match(/IF NOT public.is_lourex_role\(auth.uid\(\), ARRAY\['owner'::text, 'operations_employee'::text\]\) THEN/g)).toHaveLength(3);
    expect(sql).not.toContain("IF NOT public.is_lourex_internal(auth.uid())");
  });

  it("requires authentication and preserves fixed search paths", () => {
    expect(sql.match(/SET search_path TO ''/g)).toHaveLength(3);
    expect(sql.match(/FROM PUBLIC, anon;/g)).toHaveLength(3);
    expect(sql.match(/TO authenticated;/g)).toHaveLength(3);
  });
});
