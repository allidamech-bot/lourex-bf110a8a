import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const preflight = readFileSync(
  "supabase/migrations/20261013120000_r1_required_schema_preflight.sql", "utf8",
);
const migration = readFileSync(
  "supabase/migrations/20261013123000_r1_partner_scope_lockdown.sql", "utf8",
);
const related = readFileSync(
  "supabase/migrations/20261013124000_r1_related_objects_lockdown.sql", "utf8",
);
const stagingGate = readFileSync("supabase/tests/r1_policy_catalog_gate.sql", "utf8");
const reporting = readFileSync(
  "supabase/migrations/20261013125000_r1_reporting_rpc_boundary.sql", "utf8",
);
const packing = readFileSync(
  "supabase/migrations/20261013130000_r1_supplier_packing_scope.sql", "utf8",
);
const tracking = readFileSync(
  "supabase/migrations/20261013131000_r1_tracking_visibility_lockdown.sql", "utf8",
);
const eventWriter = readFileSync(
  "supabase/migrations/20261013132000_r1_system_event_writer_lockdown.sql", "utf8",
);
const storage = readFileSync(
  "supabase/migrations/20261013134000_r1_storage_boundary.sql", "utf8",
);
const notifications = readFileSync(
  "supabase/migrations/20261013135000_r1_notification_recipient_scope.sql", "utf8",
);
const partnerType = readFileSync(
  "supabase/migrations/20261013140000_r1_partner_type_consistency.sql", "utf8",
);

/**
 * Source-level regression gates only. Run staging SQL and authenticated
 * PostgreSQL RLS integration tests before a production deployment.
 */
describe("R1 partner-scope migration source checks", () => {
  it("aborts before DDL when the connected schema lacks R1 prerequisites", () => {
    expect(preflight).toContain("R1 SCHEMA PREREQUISITES NOT MET");
    expect(preflight).toContain("to_regclass('public.' || name)");
    expect(preflight).toContain("to_regprocedure(signature)");
    expect(preflight).toContain("'ledger_entries'");
    expect(preflight).toContain("'supplier_packing_lists'");
  });

  it("drops global logistics and ledger privileges", () => {
    for (const name of [
      "Turkish Brokers have full logistics SELECT",
      "Turkish Brokers have full logistics INSERT",
      "Turkish Brokers have full logistics UPDATE",
    ]) {
      expect(migration).toContain('DROP POLICY IF EXISTS "' + name + '" ON public.shipments;');
    }
    for (const [table, name] of [
      ["ledger_accounts", "Saudi Partners can view ledger accounts"],
      ["ledger_entries", "Saudi Partners can view ledger entries"],
      ["ledger_lines", "Saudi Partners can view ledger lines"],
    ]) {
      expect(migration).toContain('DROP POLICY IF EXISTS "' + name + '" ON public.' + table + ';');
    }
  });

  it("binds partner access to an active profile and assigned deal", () => {
    expect(migration).toContain("p.status = 'active'");
    expect(migration).toContain("d.assigned_turkish_partner_id = p.id");
    expect(migration).toContain("d.assigned_saudi_partner_id = p.id");
    expect(migration).toContain("public.lourex_r1_is_assigned_shipment(shipment_id)");
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.lourex_r1_is_assigned_deal(uuid) FROM PUBLIC, anon",
    );
  });

  it("removes permissive internal policies instead of stacking narrower OR policies", () => {
    for (const [table, policy] of [
      ["deals", "Internal Lourex roles can view deals"],
      ["deals", "Internal Lourex roles can update deals"],
      ["shipments", "Internal Lourex roles can insert shipments"],
      ["shipments", "Internal Lourex roles can update shipments"],
      ["purchase_requests", "Internal Lourex roles can view purchase requests"],
      ["tracking_updates", "Internal users can view tracking updates"],
      ["audit_logs", "Internal Lourex roles can view audit logs"],
    ]) {
      expect(migration).toContain('DROP POLICY IF EXISTS "' + policy + '" ON public.' + table + ';');
    }
  });

  it("guards shipment data integrity and stage region", () => {
    expect(migration).toContain("NEW.deal_id IS DISTINCT FROM OLD.deal_id");
    expect(migration).toContain("partner cannot modify shipment identity, cargo or route");
    expect(migration).toContain("v_next_order <> v_old_order + 1");
    expect(migration).toContain("updated_by = auth.uid()");
  });

  it("closes associated customer, profile, attachment and timeline policies", () => {
    for (const name of [
      "Internal Lourex roles can view customers",
      "Internal Lourex roles can view attachments",
      "Internal Lourex roles can manage attachments",
      "shipment_events_internal_full_access",
      "Internal roles can view system events",
      "Internal roles can view health snapshots",
    ]) {
      expect(related).toContain('DROP POLICY IF EXISTS "' + name + '"');
    }
    expect(related).toContain("p_profile_id IN (");
    expect(related).toContain("event actor must be the authenticated user");
    expect(related).toContain("shipment event is not in the actor scope");
  });

  it("makes aggregation reports respect caller RLS and secures global health snapshots", () => {
    expect(reporting).toContain("ALTER FUNCTION public.lourex_report_summary");
    expect(reporting).toContain("ALTER FUNCTION public.lourex_report_top_customers");
    expect(reporting).toContain("ALTER FUNCTION public.lourex_report_top_expense_categories");
    expect(reporting.match(/SECURITY INVOKER;/g)).toHaveLength(3);
    expect(reporting).toContain("Only owner and operations may capture system health");
  });

  it("removes global supplier packing access and rejects foreign submissions", () => {
    expect(packing).toContain("DROP POLICY IF EXISTS supplier_packing_lists_select");
    expect(packing).toContain("DROP POLICY IF EXISTS supplier_packing_items_select");
    expect(packing).toContain("public.lourex_r1_is_assigned_deal(deal_id)");
    expect(packing).toContain("public.lourex_r1_is_assigned_shipment(shipment_id)");
    expect(packing).toContain("SECURITY DEFINER");
    expect(packing).toContain("v_shipment_id IS NULL");
    expect(packing).toContain("NOT public.lourex_r1_is_assigned_deal(v_deal_id)");
    expect(packing).toContain("R1: supplier packing list shipment is not assigned to partner");
  });

  it("removes global anonymous timeline reads and unrestricted partner inserts", () => {
    expect(tracking).toContain('DROP POLICY IF EXISTS "Public can view customer visible tracking updates"');
    expect(tracking).toContain('DROP POLICY IF EXISTS "Assigned partners can insert tracking updates"');
    expect(eventWriter).toContain("R1: system event writer requires owner or operations");
    expect(eventWriter).toContain("auth.uid() IS NULL");
  });

  it("removes broad partner storage policies for proofs and deal attachments", () => {
    for (const name of [
      "Internal users can read transfer proofs",
      "Internal users can manage transfer proofs",
      "Internal deal attachments can be uploaded",
      "Internal deal attachments can be updated",
      "Internal deal attachments can be deleted",
    ]) {
      expect(storage).toContain('DROP POLICY IF EXISTS "' + name + '" ON storage.objects;');
    }
    expect(storage).toContain("Lourex R1 owner ops read legacy transfer proofs");
    expect(stagingGate).toContain("deal attachment objects found in public product-images bucket");
  });

  it("limits partner notification recipients to explicitly authorized profiles", () => {
    expect(notifications).toContain('DROP POLICY IF EXISTS "Internal Lourex users can insert notifications"');
    expect(notifications).toContain("public.lourex_r1_is_assigned_deal(d.id)");
    expect(notifications).toContain("recipient.status = 'active'");
    expect(notifications).toContain("REVOKE ALL ON FUNCTION public.lourex_r1_can_notify(uuid) FROM PUBLIC, anon");
    expect(notifications).toContain("WITH CHECK (public.lourex_r1_can_notify(user_id))");
  });

  it("repairs legacy turkey partner types to canonical turkish without changing roles", () => {
    expect(partnerType).toContain("DROP CONSTRAINT IF EXISTS profiles_partner_type_check");
    expect(partnerType).toContain("WHEN role = 'turkish_partner' THEN 'turkish'");
    expect(partnerType).toContain("CHECK (partner_type IS NULL OR partner_type IN ('turkish', 'saudi'))");
    expect(stagingGate).toContain("inconsistent stored partner_type");
  });

  it("includes a real-database catalog test without pretending it ran", () => {
    expect(stagingGate).toContain("FROM pg_policies p");
    expect(stagingGate).toContain("NOT c.relrowsecurity");
    expect(stagingGate).toContain("has_function_privilege(");
  });
});
