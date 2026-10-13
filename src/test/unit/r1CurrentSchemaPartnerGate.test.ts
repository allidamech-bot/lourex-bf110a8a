import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20261013162000_r1_existing_schema_partner_containment.sql",
  "utf8",
);

describe("R1 current-schema partner restrictions", () => {
  it("depends only on live operational tables, not unbuilt ledger or packing systems", () => {
    expect(sql).toContain("to_regclass('public.deals')");
    expect(sql).toContain("to_regclass('public.shipments')");
    expect(sql).not.toContain("to_regclass('public.ledger_entries')");
    expect(sql).not.toContain("to_regclass('public.shipment_events')");
    expect(sql).not.toContain("CREATE TABLE");
  });

  it("intersects every broad legacy partner grant instead of adding another permissive OR", () => {
    const policies = sql.match(/CREATE POLICY "[^"]+"[\s\S]*?\bAS RESTRICTIVE\b/g) || [];
    expect(policies.length).toBeGreaterThanOrEqual(15);
    expect(sql).toContain("ON public.deals AS RESTRICTIVE FOR SELECT");
    expect(sql).toContain("ON public.shipments AS RESTRICTIVE FOR UPDATE");
    expect(sql).toContain("ON public.purchase_requests AS RESTRICTIVE FOR SELECT");
    expect(sql).toContain("ON public.lourex_customers AS RESTRICTIVE FOR SELECT");
    expect(sql).toContain("ON public.attachments AS RESTRICTIVE FOR ALL");
    expect(sql).toContain("ON public.tracking_updates AS RESTRICTIVE FOR INSERT");
    expect(sql).toContain("ON public.notifications AS RESTRICTIVE FOR INSERT");
  });

  it("checks partner assignment, active profile, and caller-controlled event identity", () => {
    expect(sql).toContain("p.status = 'active'");
    expect(sql).toContain("d.assigned_turkish_partner_id = p.id");
    expect(sql).toContain("d.assigned_saudi_partner_id = p.id");
    expect(sql).toContain("updated_by = auth.uid()");
    expect(sql).toContain("updated_by_role = public.current_lourex_role()");
    expect(sql).toContain("public.lourex_r1_is_assigned_shipment(shipment_id)");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.lourex_r1_is_assigned_deal(uuid) FROM PUBLIC, anon");
  });

  it("does not let inactive partners bypass restrictive RLS predicates", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.lourex_r1_is_partner_actor()");
    expect(sql).toContain("NOT public.lourex_r1_is_partner_actor()");
    expect(sql).not.toContain("NOT public.is_lourex_role(auth.uid(), ARRAY['turkish_partner','saudi_partner'])");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.lourex_r1_is_partner_actor() FROM PUBLIC, anon");
  });

  it("guards the structural columns and disallows direct stage and evidence edits", () => {
    expect(sql).toContain("to_jsonb(NEW) - ARRAY['operational_status','updated_at']");
    expect(sql).toContain("to_jsonb(NEW) - ARRAY['current_stage_code','customer_visible_note','updated_at']");
    expect(sql).toContain("pg_trigger_depth() < 2");
    expect(sql).toContain("partner cannot directly modify deal structure");
    expect(sql).toContain("partner cannot directly modify shipment ownership");
    expect(sql).toContain('partner attachment delete guard"');
    expect(sql).toContain("FOR DELETE TO authenticated");
  });
});
