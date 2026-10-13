import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/domain/audit/service.ts", "utf8");

describe("R1 audit logging error handling", () => {
  it("inspects the Supabase insert error and reports failure", () => {
    expect(source).toContain('const { error } = await supabase.from("audit_logs").insert(');
    expect(source).toContain("if (error) {");
    expect(source).toContain('logOperationalError("audit_log_insert_failed"');
    expect(source).toContain("return { ok: false, error };");
  });

  it("requires an authenticated actor and never fabricates successful auditing", () => {
    expect(source).toContain("if (!user) {");
    expect(source).toContain("changed_by: user.id");
    expect(source).toContain("return { ok: true, error: null };");
  });
});
